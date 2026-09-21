import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/request-guard';
import { authorizeOrderAction } from '@/lib/order-access-server';
import { isReturnEligible, publicOrderSummary } from '@/lib/order-access';
import { CommunicationTemplates } from '@/lib/communication-templates';
import { notifyCustomer } from '@/lib/customer-notifications';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const limited = enforceRateLimit(request, 'order-return-submit', 8, 15 * 60_000);
    if (limited) return limited;

    try {
        const { id: orderId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const accessToken = body.accessToken || body.t;
        const returnSessionToken = body.returnSessionToken || body.rs;
        const reason = String(body.reason || '').trim();

        if (reason.length < 8) {
            return NextResponse.json({
                success: false,
                message: 'Tell us why you are returning this order (at least 8 characters).',
            }, { status: 400 });
        }

        const auth = await authorizeOrderAction({
            request,
            orderId,
            action: 'return',
            accessToken,
            returnSessionToken,
            requireReturnSession: true,
        });
        if (!auth.ok) {
            return NextResponse.json({
                success: false,
                message: auth.message,
                otpRequired: Boolean((auth as { otpRequired?: boolean }).otpRequired),
            }, { status: auth.status });
        }

        const order = auth.order.data;
        const eligibility = isReturnEligible(order);
        if (!eligibility.ok) {
            return NextResponse.json({ success: false, message: eligibility.message }, { status: 409 });
        }

        const returnRequestedAt = new Date().toISOString();
        await auth.order.ref.update({
            returnStatus: 'Requested',
            returnReason: reason,
            returnRequestedAt,
        });

        const updated = {
            ...order,
            id: orderId,
            returnStatus: 'Requested' as const,
            returnReason: reason,
            returnRequestedAt,
        };

        const template = CommunicationTemplates.getReturnRequested(updated as any);
        void notifyCustomer({
            userId: order.userId,
            phone: order.phone,
            message: template.smsBody,
            type: 'order',
            orderId,
        });

        try {
            const admins = await adminDb.collection('users').where('role', '==', 'admin').limit(25).get();
            const batch = adminDb.batch();
            const shortId = String(orderId).slice(0, 5).toUpperCase();
            for (const adminDoc of admins.docs) {
                batch.set(adminDb.collection('notifications').doc(), {
                    userId: adminDoc.id,
                    message: `Return Requested for Order #${shortId}`,
                    date: returnRequestedAt,
                    read: false,
                    type: 'system',
                    orderId,
                });
            }
            if (!admins.empty) await batch.commit();
        } catch (error) {
            console.warn('[order-return] admin notify failed:', error);
        }

        return NextResponse.json({
            success: true,
            message: 'Return request submitted. We will review it shortly.',
            order: publicOrderSummary(updated, orderId),
        });
    } catch (error: any) {
        console.error('[order-return]', error);
        return NextResponse.json({
            success: false,
            message: error?.message || 'Could not submit return',
        }, { status: 500 });
    }
}
