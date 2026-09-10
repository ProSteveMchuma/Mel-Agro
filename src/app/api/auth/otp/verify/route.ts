import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/request-guard';
import { verifyLoginOtp } from '@/lib/phone-otp-server';

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'auth-otp-verify', 20, 15 * 60_000);
    if (limited) return limited;

    try {
        const { phone, code } = await request.json();
        const result = await verifyLoginOtp(String(phone || ''), String(code || ''));
        if (!result.ok || !result.token) {
            return NextResponse.json({ success: false, message: result.message }, { status: 400 });
        }
        return NextResponse.json({ success: true, token: result.token });
    } catch (error) {
        console.error('[auth-otp-verify]', error);
        return NextResponse.json({ success: false, message: 'Could not verify the code. Please try again.' }, { status: 500 });
    }
}
