import 'server-only';
import twilio from 'twilio';
import { normalizeKenyanPhone } from '@/lib/account-upgrade';
import { reportIncident } from '@/lib/incident-reporting';

export function twilioWhatsAppConfigured(): boolean {
    return Boolean(
        process.env.TWILIO_ACCOUNT_SID
        && process.env.TWILIO_AUTH_TOKEN
        && process.env.TWILIO_WHATSAPP_NUMBER,
    );
}

export async function sendTwilioWhatsApp(to: string, body: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!twilioWhatsAppConfigured()) {
        return { ok: false, reason: 'WhatsApp provider is not configured' };
    }
    try {
        const phone = normalizeKenyanPhone(to);
        const from = String(process.env.TWILIO_WHATSAPP_NUMBER);
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await client.messages.create({
            body,
            from: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
            to: `whatsapp:${phone}`,
        });
        return { ok: true };
    } catch (error) {
        const reason = error instanceof Error ? error.message : 'Failed to send WhatsApp';
        void reportIncident({
            type: 'notification_failure',
            severity: 'warning',
            source: 'twilio-whatsapp',
            message: reason,
        });
        return { ok: false, reason };
    }
}
