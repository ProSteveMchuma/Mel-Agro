export const NotificationService = {
    sendEmail: async (to: string, subject: string, body: string) => {
        try {
            await fetch('/api/notifications/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, subject, html: body }),
            });
        } catch (error) {
            console.error("Email Notification Error:", error);
        }
    },

    sendSMS: async (to: string, message: string) => {
        try {
            await fetch('/api/notifications/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, message }),
            });
        } catch (error) {
            console.error("SMS Notification Error:", error);
        }
    },

    sendWhatsApp: async (to: string, message: string) => {
        console.log(`[WHATSAPP] To: ${to}, Message: ${message}`);
        // WhatsApp API integration (e.g., Twilio/Meta) would go here.
        // For now, we'll keep this as a log or potentially use the SMS route if appropriate.
    }
};
