import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { to, message } = await request.json();

        if (!to || !message) {
            return NextResponse.json({ success: false, message: 'To (phone number) and Message are required' }, { status: 400 });
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_PHONE_NUMBER; // You might need to add this to .env.local if different from WhatsApp

        // Note: For Twilio SMS, 'from' must be a Twilio phone number or Alphanumeric Sender ID (where supported)
        // If not set, we'll try to use the WhatsApp number but without the 'whatsapp:' prefix if possible,
        // or fallback to mock if no number is available.

        if (!accountSid || !authToken) {
            console.warn("Missing Twilio environment variables. Logging SMS instead.");
            console.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
            return NextResponse.json({
                success: true,
                message: "SMS logged to console (Mock Mode - Missing Twilio Config)"
            });
        }

        const client = require('twilio')(accountSid, authToken);

        // Use a specific Twilio SMS number if available, otherwise try to reuse the WhatsApp number (stripping prefix)
        // or default to a hardcoded one if you have one.
        // For now, let's assume the user might add TWILIO_SMS_NUMBER or we use a fallback.
        const smsFrom = process.env.TWILIO_SMS_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER?.replace('whatsapp:', '') || '';

        if (!smsFrom) {
            console.warn("Missing Twilio Sender Number. Logging SMS instead.");
            console.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
            return NextResponse.json({
                success: true,
                message: "SMS logged to console (Mock Mode - Missing Sender Number)"
            });
        }

        const response = await client.messages.create({
            body: message,
            from: smsFrom,
            to: to
        });

        return NextResponse.json({
            success: true,
            message: 'SMS sent successfully via Twilio',
            details: response
        });

    } catch (error) {
        console.error('Twilio SMS Error:', error);
        return NextResponse.json({ success: false, message: 'Failed to send SMS via Twilio' }, { status: 500 });
    }
}
