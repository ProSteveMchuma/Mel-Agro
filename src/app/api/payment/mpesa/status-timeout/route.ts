import { NextResponse } from 'next/server';
import { verifySafaricomCallback } from '@/lib/safaricom-ips';

export async function POST(request: Request) {
    const ipCheck = verifySafaricomCallback(request);
    if (!ipCheck.ok) {
        console.warn(`Status Timeout REJECTED — ${ipCheck.reason}`);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
    try {
        const payload = await request.json().catch(() => ({}));
        console.warn('TransactionStatus Timeout:', JSON.stringify(payload));
    } catch {
        // ignore
    }
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
