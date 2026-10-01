import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-server';
import { adminDb } from '@/lib/firebase-admin';
import { normalizeKenyanPhone } from '@/lib/account-upgrade';
import { createStaffCustomer, findCustomersByPhone } from '@/lib/staff-customer';

export async function GET(request: Request) {
    const actor = await requirePermission(request, 'orders.manage');
    if (!actor.ok) {
        return NextResponse.json({ success: false, message: actor.message }, { status: actor.message?.includes('Missing') ? 403 : 401 });
    }

    const phone = new URL(request.url).searchParams.get('phone') || '';
    try {
        normalizeKenyanPhone(phone);
    } catch {
        return NextResponse.json({ success: false, message: 'Enter a valid Kenyan phone number (e.g. 0712 345 678).' }, { status: 400 });
    }

    const customers = await findCustomersByPhone(phone);
    return NextResponse.json({ success: true, customers });
}

export async function POST(request: Request) {
    const actor = await requirePermission(request, 'customers.manage');
    if (!actor.ok) {
        return NextResponse.json({ success: false, message: actor.message }, { status: actor.message?.includes('Missing') ? 403 : 401 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await createStaffCustomer(String(body?.phone || ''), String(body?.name || ''));
    if (!result.ok) {
        return NextResponse.json({ success: false, message: result.message }, { status: result.status });
    }

    if (result.created) {
        const customer = result.customers[0];
        await adminDb.collection('adminAuditLog').add({
            action: 'whatsapp_customer_created',
            actorId: actor.uid,
            actorEmail: actor.email || null,
            targetId: customer?.id || null,
            after: { phone: customer?.phone || null, name: customer?.name || null },
            createdAt: new Date().toISOString(),
        });
    }

    return NextResponse.json({ success: true, created: result.created, customers: result.customers });
}
