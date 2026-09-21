import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/request-guard';
import { authorizeOrderAction } from '@/lib/order-access-server';
import { sendLoginOtp } from '@/lib/phone-otp-server';
import { normalizeKenyanPhone } from '@/lib/account-upgrade';

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const limited = enforceRateLimit(request, 'order-return-otp-send', 8, 15 * 60_000);
    if (limited) return limited;

    try {
        const { id: orderId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const accessToken = body.accessToken || body.t;

        const auth = await authorizeOrderAction({
            request,
            orderId,
            action: 'return',
            accessToken,
        });
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
        }

        // Logged-in owners skip OTP.
        if (auth.via === 'auth') {
            return NextResponse.json({
                success: true,
                skipped: true,
                message: 'You are already signed in for this order.',
            });
        }

        const phone = normalizeKenyanPhone(String(auth.order.data.phone || ''));
        const result = await sendLoginOtp(phone);
        return NextResponse.json(result, { status: result.ok ? 200 : 429 });
    } catch (error: any) {
        console.error('[order-return-otp-send]', error);
        return NextResponse.json({
            success: false,
            message: error?.message || 'Could not send verification code',
        }, { status: 500 });
    }
}
