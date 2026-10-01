import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/request-guard';

/**
 * Public notification relays are sealed. Customer messaging must go through
 * server-only helpers (`notifyCustomer` / `sendServerSms`) which pick the
 * destination from an order or verified contact — never from an arbitrary client body.
 */
export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'notification-sms', 10, 60_000);
    if (limited) return limited;

    // Even staff must not use this open relay — use order/admin flows instead.
    const auth = await requirePermission(request, 'orders.manage');
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 403 });
    }

    return NextResponse.json(
        {
            success: false,
            message: 'Direct SMS relay is disabled. Use order or admin notification flows.',
        },
        { status: 410 },
    );
}
