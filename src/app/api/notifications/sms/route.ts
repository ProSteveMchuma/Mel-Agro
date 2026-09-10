import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/request-guard';
import { reportIncident } from '@/lib/incident-reporting';
import { sendServerSms } from '@/lib/server-notifications';

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'notification-sms', 30, 60_000);
    if (limited) return limited;

    const auth = await requireUser(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }

    try {
        const { to, message } = await request.json();

        if (!to || !message) {
            return NextResponse.json({ success: false, message: 'To (phone number) and Message are required' }, { status: 400 });
        }

        const result = await sendServerSms(to, message);
        if (result.ok) {
            return NextResponse.json({ success: true, message: 'SMS sent successfully' });
        }

        const unconfigured = result.reason === 'SMS provider is not configured'
            || result.reason === 'Advanta credentials not configured'
            || result.reason === 'Advanta sender ID not configured';

        if (unconfigured) {
            return NextResponse.json({ success: false, message: result.reason }, { status: 503 });
        }

        void reportIncident({
            type: 'notification_failure',
            severity: 'warning',
            source: 'advanta-sms',
            message: result.reason || 'SMS provider rejected message',
        });
        return NextResponse.json({ success: false, message: result.reason || 'Failed to send SMS via provider' }, { status: 500 });
    } catch (error) {
        console.error('SMS API Error:', error);
        void reportIncident({
            type: 'notification_failure',
            severity: 'warning',
            source: 'advanta-sms',
            message: error instanceof Error ? error.message : 'SMS delivery failed',
        });
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
