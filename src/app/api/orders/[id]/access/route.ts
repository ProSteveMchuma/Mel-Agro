import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/request-guard';
import { authorizeOrderAction } from '@/lib/order-access-server';
import { publicOrderSummary, type OrderAccessAction } from '@/lib/order-access';

const ACTIONS = new Set<OrderAccessAction>(['view', 'pay', 'return']);

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const limited = enforceRateLimit(request, 'order-access', 60, 60_000);
    if (limited) return limited;

    const { id: orderId } = await context.params;
    const url = new URL(request.url);
    const actionParam = (url.searchParams.get('action') || 'view') as OrderAccessAction;
    const accessToken = url.searchParams.get('t') || url.searchParams.get('token');

    if (!ACTIONS.has(actionParam) || actionParam === 'rs') {
        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }

    const auth = await authorizeOrderAction({
        request,
        orderId,
        action: actionParam,
        accessToken,
    });

    if (!auth.ok) {
        return NextResponse.json(
            { success: false, message: auth.message, otpRequired: actionParam === 'return' },
            { status: auth.status },
        );
    }

    const summary = publicOrderSummary(auth.order.data, auth.order.id);
    return NextResponse.json({
        success: true,
        order: summary,
        action: actionParam,
        access: auth.via,
        otpRequired: actionParam === 'return' && auth.via === 'token',
        canPay: summary.paymentStatus !== 'Paid' && summary.status !== 'Cancelled',
    });
}
