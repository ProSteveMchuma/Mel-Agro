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

        console.log(`[WHATSAPP API] Attempting to send message to ${to}`);

        if (!accountSid || !authToken || !from) {
            console.warn("[WHATSAPP API] Missing Twilio environment variables.");
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

        console.log(`[WHATSAPP API] Sending from ${from} to ${formattedTo}`);

        const response = await client.messages.create({
            body: message,
            from: from,
            to: formattedTo
        });

        console.log("[WHATSAPP API] Success:", response.sid);

        return NextResponse.json({
            success: true,
            message: 'WhatsApp sent successfully',
            details: response
        });

    } catch (error: any) {
        console.error('[WHATSAPP API] Error:', error);
        return NextResponse.json({ success: false, message: 'Failed to send WhatsApp', error: error.message }, { status: 500 });
    }
}
