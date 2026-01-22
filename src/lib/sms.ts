// This service handles sending SMS notifications to farmers
// We use Africa's Talking as it is the standard for SMS in Kenya

// TODO: To enable real SMS, install 'africastalking' and uncomment the code below
// npm install africastalking

const MOCK_MODE = true; // Set to false when you have API keys

export const SmsService = {
    sendOrderUpdate: async (phoneNumber: string, orderId: string, status: string, name?: string) => {
        if (!phoneNumber) return;

        // Ensure Kenyan format (254...)
        let formattedPhone = phoneNumber.replace(/\s/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '+254' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('+')) {
            formattedPhone = '+' + formattedPhone;
        }

        const message = `Habari ${name || 'Farmer'}, your MelAgro order #${orderId.slice(0, 5)} is now ${status}. Thank you for farming with us!`;

        // Real Implementation with Fallback
        try {
            // Check for credentials - using consistent naming
            const apiKey = process.env.AFRICASTALKING_API_KEY || process.env.AT_API_KEY;
            const username = process.env.AFRICASTALKING_USERNAME || process.env.AT_USERNAME || 'sandbox';

            if (!apiKey || apiKey === 'undefined' || apiKey === 'null') {
                console.warn("SMS: No API key found. Logging to console (Mock Mode).");
                console.log(`[SMS MOCK] To: ${formattedPhone}, Msg: ${message}`);
                return { success: true, message: "Mock SMS logged" };
            }

            // ONLY require and initialize if we have what we need
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const AfricasTalking = require('africastalking');
            const atClient = AfricasTalking({ apiKey, username });
            const sms = atClient.SMS;

            const response = await sms.send({
                to: formattedPhone,
                message: message,
            });

            console.log("SMS Sent successfully via Africa's Talking");
            return { success: true, details: response };
        } catch (error) {
            console.error("SMS Failed:", error);
            if (MOCK_MODE) {
                console.log(`[SMS FAIL-SAFE MOCK] To: ${formattedPhone}, Msg: ${message}`);
            }
            return { success: false, error };
        }
    }
};
