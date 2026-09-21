import { adminDb } from '@/lib/firebase-admin';
import {
  CmsPageContent,
  CmsPageSlug,
  defaultPageContent,
  draftDocId,
  liveDocId,
  parsePageContent,
} from '@/lib/cms-pages';

export type CmsPageSnapshot = {
  content: CmsPageContent;
  version: number;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

function stripMeta(data: Record<string, unknown> | undefined) {
  if (!data) return {};
  const { version, publishedAt, publishedBy, updatedAt, updatedBy, ...content } = data;
  return content;
}

export async function getLiveCmsPage(slug: CmsPageSlug): Promise<CmsPageSnapshot> {
  try {
    const snap = await adminDb.collection('content').doc(liveDocId(slug)).get();
    if (!snap.exists) {
      return { content: defaultPageContent(slug), version: 0, publishedAt: null };
    }
    const data = snap.data() || {};
    return {
      content: parsePageContent(slug, stripMeta(data as Record<string, unknown>)),
      version: Number(data.version || 0),
      publishedAt: (data.publishedAt as string) || null,
    };
  } catch (error) {
    console.warn(`Failed to load live CMS page ${slug}:`, error);
    return { content: defaultPageContent(slug), version: 0, publishedAt: null };
  }
}

export async function getDraftCmsPage(slug: CmsPageSlug): Promise<CmsPageSnapshot> {
  const [live, draft] = await Promise.all([
    adminDb.collection('content').doc(liveDocId(slug)).get(),
    adminDb.collection('content').doc(draftDocId(slug)).get(),
  ]);
  const liveData = live.data() || {};
  const draftData = draft.exists ? draft.data() || {} : liveData;
  const source = draft.exists ? draftData : liveData;
  return {
    content: parsePageContent(slug, stripMeta(source as Record<string, unknown>)),
    version: Number(draftData.version ?? liveData.version ?? 0),
    updatedAt: (draftData.updatedAt as string) || null,
    publishedAt: (liveData.publishedAt as string) || null,
  };
}
