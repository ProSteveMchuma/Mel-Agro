import { NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/request-guard';
import { requireUser } from '@/lib/auth-server';
import { linkPhoneToAuthenticatedUser } from '@/lib/phone-otp-server';

/**
 * Link a verified phone number onto the caller’s Auth UID (prevents duplicate accounts).
 * Body: { phone, code }
 */
export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'auth-link-phone', 20, 15 * 60_000);
    if (limited) return limited;

    const auth = await requireUser(request);
    if (!auth.ok || !auth.uid) {
        return NextResponse.json({ success: false, message: auth.message || 'Sign in required.' }, { status: 401 });
    }

    try {
        const body = await request.json().catch(() => ({}));
        const result = await linkPhoneToAuthenticatedUser(
            auth.uid,
            String(body.phone || ''),
            String(body.code || ''),
        );
        if (!result.ok) {
            return NextResponse.json(
                { success: false, conflict: Boolean(result.conflict), message: result.message },
                { status: result.conflict ? 409 : 400 },
            );
        }
        return NextResponse.json({ success: true, message: result.message });
    } catch (error) {
        console.error('[auth-link-phone]', error);
        return NextResponse.json({ success: false, message: 'Could not link phone. Please try again.' }, { status: 500 });
    }
}
