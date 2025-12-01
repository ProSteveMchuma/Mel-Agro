import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { to, message } = await request.json();

        if (!to || !message) {
            return NextResponse.json({ success: false, message: 'To (phone number) and Message are required' }, { status: 400 });
        }

        const apiKey = process.env.AFRICASTALKING_API_KEY;
        const username = process.env.AFRICASTALKING_USERNAME || 'sandbox'; // Default to sandbox
        const from = process.env.AFRICASTALKING_SENDER_ID; // Optional

        if (!apiKey) {
            console.warn("Missing Africa's Talking API Key. Logging SMS instead.");
            console.log(`[MOCK SMS] To: ${to}, Message: ${message}`);
            return NextResponse.json({
                success: true,
                message: "SMS logged to console (Mock Mode - Missing API Key)"
            });
        }

        // Africa's Talking API Endpoint
        const url = 'https://api.africastalking.com/version1/messaging';
        // Use sandbox URL if username is 'sandbox'
        const endpoint = username === 'sandbox'
            ? 'https://api.sandbox.africastalking.com/version1/messaging'
            : url;

        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('to', to);
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

        // Check for success in AT response structure
        if (data.SMSMessageData && data.SMSMessageData.Recipients && data.SMSMessageData.Recipients.length > 0) {
            return NextResponse.json({
                success: true,
                message: 'SMS sent successfully',
                details: data.SMSMessageData
            });
        } else {
            console.error("Africa's Talking Error:", data);
            return NextResponse.json({ success: false, message: 'Failed to send SMS via provider', details: data }, { status: 500 });
        }

    } catch (error) {
        console.error('SMS API Error:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}
