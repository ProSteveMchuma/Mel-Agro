import { NextResponse } from 'next/server';
import { expireStockReservations } from '@/lib/expire-stock-reservations';

export async function GET(request: Request) {
    const expected = process.env.CRON_SECRET;
    const provided = request.headers.get('authorization');
    if (!expected || provided !== `Bearer ${expected}`) {
        return NextResponse.json({ success: false, message: 'Unauthorized scheduled task' }, { status: 401 });
    }

    const result = await expireStockReservations();
    return NextResponse.json({
        success: true,
        ...result,
        completedAt: new Date().toISOString(),
    });
}
