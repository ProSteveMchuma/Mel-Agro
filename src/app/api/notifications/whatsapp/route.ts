import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { to, message } = await request.json();

        if (!to || !message) {
            return NextResponse.json({ success: false, message: 'To (phone number) and Message are required' }, { status: 400 });
        }

        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const from = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., 'whatsapp:+14155238886'

        if (!accountSid || !authToken || !from) {
            console.warn("Missing Twilio WhatsApp environment variables. Logging WhatsApp message instead.");
            console.log(`[MOCK WHATSAPP] To: ${to}, Message: ${message}`);
            return NextResponse.json({
                success: true,
                message: "WhatsApp logged to console (Mock Mode - Missing Config)"
            });
        }

        // Twilio API Integration
        const client = require('twilio')(accountSid, authToken);

        // Ensure 'to' number has 'whatsapp:' prefix if using Twilio
        const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

        const response = await client.messages.create({
            body: message,
            from: from,
            to: formattedTo
        });

        return NextResponse.json({
            success: true,
            message: 'WhatsApp sent successfully',
            details: response
        });

    } catch (error) {
        console.error('WhatsApp API Error:', error);
        return NextResponse.json({ success: false, message: 'Failed to send WhatsApp' }, { status: 500 });
    }
}
