import { NextResponse } from 'next/server';
import twilio from 'twilio';
import { requireUser } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/request-guard';
import { reportIncident } from '@/lib/incident-reporting';

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'notification-whatsapp', 30, 60_000);
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

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_WHATSAPP_NUMBER;

        if (!accountSid || !authToken || !from) {
            console.warn('WhatsApp provider is not configured; message was not sent.');
            return NextResponse.json({
                success: false,
                message: "WhatsApp provider is not configured"
            }, { status: 503 });
        }

        const client = twilio(accountSid, authToken);
        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        const response = await client.messages.create({
            body: message,
            from: from,
            to: formattedTo,
        });

        return NextResponse.json({
            success: true,
            message: 'WhatsApp sent successfully',
            sid: response.sid,
        });

    } catch (error: any) {
        console.error('[WHATSAPP API] Error:', error);
        void reportIncident({ type: 'notification_failure', severity: 'warning', source: 'twilio-whatsapp', message: error?.message || 'WhatsApp delivery failed' });
        return NextResponse.json({ success: false, message: 'Failed to send WhatsApp', error: error.message }, { status: 500 });
    }
}
