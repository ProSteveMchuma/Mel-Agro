import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-server';
import { ADMIN_PERMISSIONS } from '@/lib/admin-permissions';
import {
    builtinStaffRoles,
    isBuiltinRoleId,
    normalizePermissionList,
    type StaffRoleDefinition,
} from '@/lib/staff-roles';

async function requireSuperAdmin(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return { ...auth, ok: false as const };
    if (auth.role !== 'super-admin') {
        return { ok: false as const, message: 'Only a super-admin can manage staff roles.' };
    }
    return auth;
}

function serializeCustom(docId: string, data: Record<string, unknown>): StaffRoleDefinition {
    return {
        id: docId,
        label: String(data.label || 'Untitled role'),
        description: data.description ? String(data.description) : '',
        permissions: normalizePermissionList(data.permissions),
        source: 'custom',
        updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
        updatedBy: (data.updatedBy as string | null | undefined) ?? null,
    };
}

export async function GET(request: Request) {
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }

    const snapshot = await adminDb.collection('staffRoles').orderBy('label').limit(100).get();
    const custom = snapshot.docs.map((doc) => serializeCustom(doc.id, doc.data() as Record<string, unknown>));
    const roles = [...builtinStaffRoles(), ...custom];
    return NextResponse.json({ success: true, roles });
}

const createSchema = z.object({
    label: z.string().trim().min(2).max(60),
    description: z.string().trim().max(240).optional().default(''),
    permissions: z.array(z.enum(ADMIN_PERMISSIONS)).min(1).max(ADMIN_PERMISSIONS.length),
});

const updateSchema = z.object({
    id: z.string().trim().min(1).max(128),
    label: z.string().trim().min(2).max(60).optional(),
    description: z.string().trim().max(240).optional(),
    permissions: z.array(z.enum(ADMIN_PERMISSIONS)).min(1).max(ADMIN_PERMISSIONS.length).optional(),
});

const deleteSchema = z.object({
    id: z.string().trim().min(1).max(128),
});

export async function POST(request: Request) {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ success: false, message: 'Provide a name and at least one permission.' }, { status: 400 });
    }

    const permissions = normalizePermissionList(parsed.data.permissions);
    if (permissions.length === 0) {
        return NextResponse.json({ success: false, message: 'Select at least one permission.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const ref = adminDb.collection('staffRoles').doc();
    const payload = {
        label: parsed.data.label,
        description: parsed.data.description || '',
        permissions,
        updatedAt: now,
        createdAt: now,
        updatedBy: auth.uid || null,
    };
    const auditRef = adminDb.collection('adminAuditLog').doc();
    const batch = adminDb.batch();
    batch.set(ref, payload);
    batch.set(auditRef, {
        action: 'staff_role_created',
        actorId: auth.uid,
        actorEmail: auth.email || null,
        targetId: ref.id,
        after: payload,
        createdAt: now,
    });
    await batch.commit();

    return NextResponse.json({
        success: true,
        role: serializeCustom(ref.id, payload),
    });
}

export async function PATCH(request: Request) {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 403 });
    }

    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ success: false, message: 'Invalid role update.' }, { status: 400 });
    }
    if (isBuiltinRoleId(parsed.data.id)) {
        return NextResponse.json({ success: false, message: 'Built-in profiles cannot be edited. Clone them into a custom role instead.' }, { status: 400 });
    }

    const ref = adminDb.collection('staffRoles').doc(parsed.data.id);
    const snap = await ref.get();
    if (!snap.exists) {
        return NextResponse.json({ success: false, message: 'Role not found.' }, { status: 404 });
    }

    const update: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
        updatedBy: auth.uid || null,
    };
    if (parsed.data.label !== undefined) update.label = parsed.data.label;
    if (parsed.data.description !== undefined) update.description = parsed.data.description;
    if (parsed.data.permissions !== undefined) {
        const permissions = normalizePermissionList(parsed.data.permissions);
        if (permissions.length === 0) {
            return NextResponse.json({ success: false, message: 'Select at least one permission.' }, { status: 400 });
        }
        update.permissions = permissions;
    }

    const auditRef = adminDb.collection('adminAuditLog').doc();
    const batch = adminDb.batch();
    batch.update(ref, update);
    batch.set(auditRef, {
        action: 'staff_role_updated',
        actorId: auth.uid,
        actorEmail: auth.email || null,
        targetId: parsed.data.id,
        before: snap.data(),
        after: update,
        createdAt: update.updatedAt,
    });
    await batch.commit();

    const next = { ...(snap.data() as Record<string, unknown>), ...update };
    return NextResponse.json({ success: true, role: serializeCustom(parsed.data.id, next) });
}

export async function DELETE(request: Request) {
    const auth = await requireSuperAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 403 });
    }

    const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json({ success: false, message: 'Role id is required.' }, { status: 400 });
    }
    if (isBuiltinRoleId(parsed.data.id)) {
        return NextResponse.json({ success: false, message: 'Built-in profiles cannot be deleted.' }, { status: 400 });
    }

    const assigned = await adminDb
        .collection('users')
        .where('staffProfile', '==', parsed.data.id)
        .limit(1)
        .get();
    if (!assigned.empty) {
        return NextResponse.json(
            { success: false, message: 'Reassign staff using this role before deleting it.' },
            { status: 409 },
        );
    }

    const ref = adminDb.collection('staffRoles').doc(parsed.data.id);
    const snap = await ref.get();
    if (!snap.exists) {
        return NextResponse.json({ success: false, message: 'Role not found.' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const auditRef = adminDb.collection('adminAuditLog').doc();
    const batch = adminDb.batch();
    batch.delete(ref);
    batch.set(auditRef, {
        action: 'staff_role_deleted',
        actorId: auth.uid,
        actorEmail: auth.email || null,
        targetId: parsed.data.id,
        before: snap.data(),
        createdAt: now,
    });
    await batch.commit();

    return NextResponse.json({ success: true });
}
