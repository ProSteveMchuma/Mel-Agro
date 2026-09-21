import { NextResponse } from 'next/server';
import { initiateSTKPush } from '@/lib/mpesa-server';
import { checkoutRequestFields } from '@/lib/mpesa-orders';
import { enforceRateLimit } from '@/lib/request-guard';
import { authorizeOrderAction } from '@/lib/order-access-server';

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const limited = enforceRateLimit(request, 'order-pay-stk', 10, 10 * 60_000);
    if (limited) return limited;

    try {
        const { id: orderId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const accessToken = body.accessToken || body.t;
        const overridePhone = body.phoneNumber;

        const auth = await authorizeOrderAction({
            request,
            orderId,
            action: 'pay',
            accessToken,
        });
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
        }

        const order = auth.order.data;
        if (order.paymentStatus === 'Paid') {
            return NextResponse.json({ success: false, message: 'Order is already paid' }, { status: 409 });
        }

        const phoneNumber = overridePhone || order.phone;
        if (!phoneNumber) {
            return NextResponse.json({ success: false, message: 'Order has no phone number' }, { status: 400 });
        }

        if (!process.env.MPESA_CONSUMER_KEY) {
            if (process.env.NODE_ENV === 'production') {
                return NextResponse.json({ success: false, message: 'M-Pesa is temporarily unavailable' }, { status: 503 });
            }
            const mockId = `ws_CO_${Date.now()}_Mock`;
            await auth.order.ref.update({
                ...checkoutRequestFields(mockId),
                paymentInitiatedAt: new Date().toISOString(),
                paymentStatus: 'Unpaid',
                retryCount: (order.retryCount || 0) + 1,
            });
            return NextResponse.json({
                success: true,
                message: 'M-Pesa STK Push sent (mock)',
                checkoutRequestID: mockId,
            });
        }

        const stkData = await initiateSTKPush({
            phoneNumber,
            amount: order.total,
            accountReference: `Order-${String(orderId).slice(0, 8)}`,
            transactionDesc: `Mel-Agri Order ${String(orderId).slice(0, 8)}`,
        });

        if (stkData.ResponseCode === '0' && stkData.CheckoutRequestID) {
            await auth.order.ref.update({
                ...checkoutRequestFields(stkData.CheckoutRequestID),
                paymentInitiatedAt: new Date().toISOString(),
                paymentStatus: 'Unpaid',
                retryCount: (order.retryCount || 0) + 1,
                ...(overridePhone ? { mpesaPhoneNumber: String(overridePhone) } : {}),
            });
            return NextResponse.json({
                success: true,
                message: 'Check your phone and enter your M-Pesa PIN',
                checkoutRequestID: stkData.CheckoutRequestID,
            });
        }

        return NextResponse.json({
            success: false,
            message: stkData.ResponseDescription || 'Could not send M-Pesa prompt',
        }, { status: 502 });
    } catch (error: any) {
        console.error('[order-pay-stk]', error);
        return NextResponse.json({ success: false, message: error?.message || 'Payment failed' }, { status: 500 });
    }
}
