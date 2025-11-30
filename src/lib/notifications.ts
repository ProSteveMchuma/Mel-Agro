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
        try {
            await fetch('/api/notifications/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, message }),
            });
        } catch (error) {
            console.error("WhatsApp Notification Error:", error);
        }
    },

    notify: async (preferences: string[], contact: { email?: string, phone?: string }, message: { subject: string, emailBody: string, smsBody: string }) => {
        const promises = [];

        if (preferences.includes('email') && contact.email) {
            promises.push(NotificationService.sendEmail(contact.email, message.subject, message.emailBody));
        }

        if (preferences.includes('sms') && contact.phone) {
            promises.push(NotificationService.sendSMS(contact.phone, message.smsBody));
        }

        if (preferences.includes('whatsapp') && contact.phone) {
            promises.push(NotificationService.sendWhatsApp(contact.phone, message.smsBody));
        }

        await Promise.all(promises);
    }
};
