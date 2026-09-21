import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/request-guard';
import { claimByGuestToken, claimByVerifiedPhone } from '@/lib/order-claim-server';

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'order-claim', 12, 15 * 60_000);
    if (limited) return limited;

    try {
        const body = await request.json().catch(() => ({}));
        const guestToken = typeof body.guestToken === 'string' ? body.guestToken.trim() : '';
        const byPhone = Boolean(body.byPhone);

        if (!guestToken && !byPhone) {
            return NextResponse.json(
                { success: false, message: 'guestToken or byPhone is required' },
                { status: 400 },
            );
        }

        const targetAuth = await requireUser(request);
        if (!targetAuth.ok || !targetAuth.uid) {
            return NextResponse.json(
                { success: false, message: targetAuth.message || 'Unauthorized' },
                { status: 401 },
            );
        }
        const targetUid = targetAuth.uid;

        let guestCount = 0;
        let phoneCount = 0;
        const messages: string[] = [];

        if (guestToken) {
            try {
                const result = await claimByGuestToken({ guestToken, targetUid });
                guestCount = result.count;
                messages.push(result.message);
            } catch (error: any) {
                return NextResponse.json(
                    { success: false, message: error?.message || 'Guest claim failed' },
                    { status: error?.status || 400 },
                );
            }
        }

        // Always try phone reclaim after a successful guest claim, or when explicitly requested.
        if (byPhone || guestToken) {
            try {
                const result = await claimByVerifiedPhone({ targetUid });
                phoneCount = result.count;
                if (byPhone || result.count > 0) messages.push(result.message);
            } catch (error: any) {
                // Phone reclaim is best-effort when paired with guestToken (Auth phone may not be set yet).
                if (byPhone && !guestToken) {
                    return NextResponse.json(
                        { success: false, message: error?.message || 'Phone claim failed' },
                        { status: error?.status || 400 },
                    );
                }
            }
        }

        return NextResponse.json({
            success: true,
            count: guestCount + phoneCount,
            guestCount,
            phoneCount,
            message: messages.filter(Boolean).join(' · ') || 'Nothing to claim',
        });
    } catch (error: any) {
        console.error('Error claiming guest orders:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 },
        );
    }
}
