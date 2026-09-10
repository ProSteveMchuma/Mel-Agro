import { getAuth } from 'firebase/auth';

async function authedFetch(url: string, body: any) {
    const token = await getAuth().currentUser?.getIdToken().catch(() => null);
    return fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    });
}

export const NotificationService = {
    sendEmail: async (to: string, subject: string, body: string) => {
        try {
            await authedFetch('/api/notifications/email', { to, subject, html: body });
        } catch (error) {
            console.error("Email Notification Error:", error);
        }
    },

    sendSMS: async (to: string, message: string) => {
        try {
            await authedFetch('/api/notifications/sms', { to, message });
        } catch (error) {
            console.error("SMS Notification Error:", error);
        }
    },

    sendWhatsApp: async (to: string, message: string) => {
        try {
            await authedFetch('/api/notifications/whatsapp', { to, message });
        } catch (error) {
            console.error("WhatsApp Notification Error:", error);
        }
    },

    notify: async (_preferences: string[], contact: { email?: string, phone?: string }, message: { subject: string, emailBody: string, smsBody: string }) => {
        // System notifications go out as SMS. Email will be wired later.
        if (contact.phone) {
            await NotificationService.sendSMS(contact.phone, message.smsBody);
        }
    }
};
