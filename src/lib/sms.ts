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
        }

        const message = `Habari ${name || 'Farmer'}, your MelAgro order #${orderId.slice(0, 5)} is now ${status}. Thank you for farming with us!`;



        // Real Implementation with Fallback
        try {
            // Check for credentials
            const apiKey = process.env.AT_API_KEY;
            const username = process.env.AT_USERNAME; // 'sandbox' for dev

            if (!apiKey || !username) {
                console.warn("Missing Africa's Talking credentials (AT_API_KEY, AT_USERNAME). Falling back to mock.");
                console.log("---------------------------------------------------");
                console.log(`[SMS MOCK] To: ${formattedPhone}`);
                console.log(`[SMS MOCK] Message: ${message}`);
                console.log("---------------------------------------------------");
                return { success: true, message: "Mock SMS sent (Missing Creds)" };
            }

            const credentials = { apiKey, username };

            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const AfricasTalking = require('africastalking')(credentials);
            const sms = AfricasTalking.SMS;

            const response = await sms.send({
                to: formattedPhone,
                message: message,
                // from: 'MELAGRO' // Shortcode if available
            });

            console.log("SMS Sent:", response);
            return { success: true, details: response };
        } catch (error) {
            console.error("SMS Failed:", error);
            // Fallback to mock logs in development if it fails (e.g. network)
            if (MOCK_MODE) {
                console.log(`[SMS FAIL-SAFE MOCK] To: ${formattedPhone}`);
                console.log(`[SMS FAIL-SAFE MOCK] Message: ${message}`);
            }
            return { success: false, error };
        }
    }
};
