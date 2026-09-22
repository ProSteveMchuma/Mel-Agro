import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { requirePermission } from '@/lib/auth-server';
import {
  CMS_PAGE_SLUGS,
  draftDocId,
  isCmsPageSlug,
  liveDocId,
  type CmsPageSlug,
} from '@/lib/cms-pages';
import { defaultBlocksPage, parseBlocksPage, validateBlocksPage } from '@/lib/cms-blocks';
import { getDraftCmsPage, getLiveCmsPage } from '@/lib/cms-pages-server';

const mutationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('saveDraft'),
    slug: z.enum(CMS_PAGE_SLUGS),
    version: z.number().int().min(0),
    content: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal('publish'),
    slug: z.enum(CMS_PAGE_SLUGS),
    version: z.number().int().min(0),
    content: z.record(z.string(), z.unknown()),
  }),
]);

function validateContent(slug: CmsPageSlug, content: unknown) {
  return validateBlocksPage(slug, content);
}

export async function GET(request: Request) {
  const actor = await requirePermission(request, 'marketing.manage');
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });

  const slugParam = new URL(request.url).searchParams.get('slug') || '';
  if (!isCmsPageSlug(slugParam)) {
    return NextResponse.json({ success: false, message: 'Unknown page slug.' }, { status: 400 });
  }

  const [live, draft] = await Promise.all([getLiveCmsPage(slugParam), getDraftCmsPage(slugParam)]);
  return NextResponse.json({
    success: true,
    slug: slugParam,
    defaults: defaultBlocksPage(slugParam),
    live: {
      content: live.content,
      version: live.version,
      publishedAt: live.publishedAt || null,
    },
    draft: {
      content: draft.content,
      version: draft.version,
      updatedAt: draft.updatedAt || null,
    },
  });
}

export async function PUT(request: Request) {
  const actor = await requirePermission(request, 'marketing.manage');
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });

  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.issues[0]?.message || 'Invalid page payload.' },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const contentParsed = validateContent(input.slug, input.content);
  if (!contentParsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: contentParsed.error.issues[0]?.message || 'Invalid page content.',
      },
      { status: 400 },
    );
  }

  const content = contentParsed.data;
  const liveRef = adminDb.collection('content').doc(liveDocId(input.slug));
  const draftRef = adminDb.collection('content').doc(draftDocId(input.slug));

  try {
    const version = await adminDb.runTransaction(async (transaction) => {
      const [live, draft] = await Promise.all([transaction.get(liveRef), transaction.get(draftRef)]);
      const currentVersion = Number(draft.data()?.version ?? live.data()?.version ?? 0);
      if (currentVersion !== input.version) throw new Error('VERSION_CONFLICT');

      const nextVersion = currentVersion + 1;
      const now = new Date().toISOString();
      // Replace document body with blocks schema (avoid leftover flat keys).
      const draftPayload = {
        schemaVersion: 2,
        blocks: content.blocks,
        version: nextVersion,
        updatedAt: now,
        updatedBy: actor.uid,
      };
      transaction.set(draftRef, draftPayload);

      if (input.action === 'publish') {
        transaction.set(liveRef, {
          schemaVersion: 2,
          blocks: content.blocks,
          version: nextVersion,
          publishedAt: now,
          publishedBy: actor.uid,
        });
      }

      transaction.set(adminDb.collection('adminAuditLog').doc(), {
        action: input.action === 'publish' ? 'page_published' : 'page_draft_saved',
        actorId: actor.uid,
        actorEmail: actor.email || null,
        targetId: input.slug,
        before: { version: currentVersion },
        after: { version: nextVersion, blockCount: content.blocks.length },
        createdAt: now,
      });

      return nextVersion;
    });

    return NextResponse.json({
      success: true,
      version,
      content: parseBlocksPage(input.slug, content),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'VERSION_CONFLICT') {
      return NextResponse.json(
        { success: false, message: 'This draft changed in another session. Reload before saving.' },
        { status: 409 },
      );
    }
    throw error;
  }
}
