import { NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/request-guard';

/** Public WhatsApp relay sealed — use server-only customer notification helpers. */
export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'notification-whatsapp', 10, 60_000);
    if (limited) return limited;

    const auth = await requirePermission(request, 'orders.manage');
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 403 });
    }

    return NextResponse.json(
        {
            success: false,
            message: 'Direct WhatsApp relay is disabled. Use order or admin notification flows.',
        },
        { status: 410 },
    );
}
