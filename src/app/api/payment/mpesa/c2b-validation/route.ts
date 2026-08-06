import { NextResponse } from 'next/server';
import { verifySafaricomCallback } from '@/lib/safaricom-ips';

export async function POST(request: Request) {
    const ipCheck = verifySafaricomCallback(request);
    if (!ipCheck.ok) {
        console.warn(`C2B Validation REJECTED — ${ipCheck.reason}`);
        return NextResponse.json({ ResultCode: 'C2B00016', ResultDesc: 'Rejected' });
    }
    try {
        await request.json().catch(() => ({}));
        console.info('C2B validation callback received');
    } catch {
        // ignore
    }
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
}
