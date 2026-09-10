import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/request-guard';
import { sendLoginOtp } from '@/lib/phone-otp-server';

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'auth-otp-send', 8, 15 * 60_000);
    if (limited) return limited;

    try {
        const { phone } = await request.json();
        const result = await sendLoginOtp(String(phone || ''));
        if (!result.ok) {
            return NextResponse.json(
                { success: false, message: result.message },
                {
                    status: result.status || 400,
                    headers: result.retryAfterSeconds
                        ? { 'Retry-After': String(result.retryAfterSeconds) }
                        : undefined,
                },
            );
        }
        return NextResponse.json({ success: true, message: result.message });
    } catch (error) {
        console.error('[auth-otp-send]', error);
        return NextResponse.json({ success: false, message: 'Could not send the code. Please try again.' }, { status: 500 });
    }
}
