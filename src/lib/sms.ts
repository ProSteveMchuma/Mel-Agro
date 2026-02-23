// This service handles sending SMS notifications to farmers
// We use Africa's Talking as it is the standard for SMS in Kenya

// TODO: To enable real SMS, install 'africastalking' and uncomment the code below
// npm install africastalking

const MOCK_MODE = false; // Real SMS is now enabled

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

        const message = `Habari ${name || 'Farmer'}, your Mel-Agri order #${orderId.slice(0, 5)} is now ${status}. Thank you for farming with us!`;

        // Send via our API route (browser-safe)
        try {
            const response = await fetch('/api/notifications/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: formattedPhone, message }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log("SMS sent successfully via API route");
                return { success: true, details: data.details };
            } else {
                console.warn("SMS API failed:", data.message);
                return { success: false, error: data.message };
            }
        } catch (error) {
            console.error("SMS Service Error:", error);
            if (MOCK_MODE) {
                console.log(`[SMS FAIL-SAFE MOCK] To: ${formattedPhone}, Msg: ${message}`);
            }
            return { success: false, error };
        }
    }
};
