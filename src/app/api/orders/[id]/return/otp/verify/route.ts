import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/request-guard';
import { authorizeOrderAction } from '@/lib/order-access-server';
import { assertCanVerifyOtp } from '@/lib/phone-otp';
import { adminDb } from '@/lib/firebase-admin';
import { normalizeKenyanPhone } from '@/lib/account-upgrade';
import { createReturnSessionToken } from '@/lib/order-access';
import { otpPhoneDocId } from '@/lib/phone-otp';

function otpPepper(): string {
    return (process.env.OTP_PEPPER || process.env.FIREBASE_PRIVATE_KEY || 'melagri-otp-pepper').slice(0, 80);
}

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> },
) {
    const limited = enforceRateLimit(request, 'order-return-otp-verify', 20, 15 * 60_000);
    if (limited) return limited;

    try {
        const { id: orderId } = await context.params;
        const body = await request.json().catch(() => ({}));
        const accessToken = body.accessToken || body.t;
        const code = String(body.code || '').trim();

        const auth = await authorizeOrderAction({
            request,
            orderId,
            action: 'return',
            accessToken,
        });
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: auth.status });
        }

        if (auth.via === 'auth') {
            return NextResponse.json({
                success: true,
                returnSessionToken: null,
                message: 'Signed-in access confirmed',
            });
        }

        const phone = normalizeKenyanPhone(String(auth.order.data.phone || ''));
        const ref = adminDb.collection('otpChallenges').doc(otpPhoneDocId(phone));
        const snap = await ref.get();
        const challenge = snap.data() || {};
        const result = assertCanVerifyOtp(challenge as any, phone, code, otpPepper());
        if (!result.ok) {
            if (result.incrementAttempts) {
                await ref.set({ attempts: (Number(challenge.attempts) || 0) + 1 }, { merge: true });
            }
            return NextResponse.json({ success: false, message: result.message }, { status: 401 });
        }

        await ref.delete().catch(() => undefined);
        const returnSessionToken = createReturnSessionToken({
            orderId,
            phone: auth.order.data.phone,
        });

        return NextResponse.json({
            success: true,
            returnSessionToken,
            message: 'Phone verified. You can continue with the return.',
        });
    } catch (error: any) {
        console.error('[order-return-otp-verify]', error);
        return NextResponse.json({
            success: false,
            message: error?.message || 'Verification failed',
        }, { status: 500 });
    }
}
