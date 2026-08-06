import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/request-guard';
import { reportIncident } from '@/lib/incident-reporting';

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

        const apiKey = process.env.AFRICASTALKING_API_KEY;
        const username = process.env.AFRICASTALKING_USERNAME || 'sandbox';
        const from = process.env.AFRICASTALKING_SENDER_ID;

        let formattedPhone = to.replace(/\s+/g, '').replace(/-/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '+254' + formattedPhone.substring(1);
        } else if (formattedPhone.startsWith('254')) {
            formattedPhone = '+' + formattedPhone;
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }

        if (!apiKey) {
            console.warn("Missing Africa's Talking API key; SMS was not sent.");
            return NextResponse.json({
                success: false,
                message: "SMS provider is not configured"
            }, { status: 503 });
        }

        const url = 'https://api.africastalking.com/version1/messaging';
        const endpoint = username === 'sandbox'
            ? 'https://api.sandbox.africastalking.com/version1/messaging'
            : url;

        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('to', formattedPhone);
        formData.append('message', message);
        if (from) formData.append('from', from);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'apiKey': apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: formData
        });

        const data = await response.json();
        console.info("Africa's Talking request completed", { ok: response.ok });

        if (data.SMSMessageData && data.SMSMessageData.Recipients && data.SMSMessageData.Recipients.length > 0) {
            return NextResponse.json({
                success: true,
                message: 'SMS sent successfully',
            });
        } else {
            console.error("Africa's Talking Error:", data);
            void reportIncident({ type: 'notification_failure', severity: 'warning', source: 'africastalking', message: 'SMS provider rejected message' });
            return NextResponse.json({ success: false, message: 'Failed to send SMS via provider', details: data }, { status: 500 });
        }

    } catch (error) {
        console.error('SMS API Error:', error);
        void reportIncident({ type: 'notification_failure', severity: 'warning', source: 'africastalking', message: error instanceof Error ? error.message : 'SMS delivery failed' });
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
