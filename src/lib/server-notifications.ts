import 'server-only';
import { isAdvantaConfigured, sendAdvantaSms } from '@/lib/advanta-sms';

function formatKenyanPhoneE164(raw: string): string {
    let p = (raw || '').replace(/\s+/g, '').replace(/-/g, '');
    if (p.startsWith('0')) p = '+254' + p.slice(1);
    else if (p.startsWith('254')) p = '+' + p;
    else if (p && !p.startsWith('+')) p = '+' + p;
    return p;
}

async function sendAfricaTalkingSms(to: string, message: string): Promise<{ ok: boolean; reason?: string }> {
    const apiKey = process.env.AFRICASTALKING_API_KEY;
    const username = process.env.AFRICASTALKING_USERNAME || 'sandbox';
    const from = process.env.AFRICASTALKING_SENDER_ID;

    if (!apiKey) return { ok: false, reason: 'SMS provider is not configured' };

    const formattedPhone = formatKenyanPhoneE164(to);
    const endpoint = username === 'sandbox'
        ? 'https://api.sandbox.africastalking.com/version1/messaging'
        : 'https://api.africastalking.com/version1/messaging';

    const body = new URLSearchParams();
    body.append('username', username);
    body.append('to', formattedPhone);
    body.append('message', message);
    if (from) body.append('from', from);

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                apiKey,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body,
        });
        const data: any = await res.json().catch(() => ({}));
        const recipients = data?.SMSMessageData?.Recipients;
        if (!Array.isArray(recipients) || recipients.length === 0) {
            console.warn('[server-sms] Africa\'s Talking did not accept the message:', data);
            return { ok: false, reason: 'Provider rejected' };
        }
        return { ok: true };
    } catch (e: any) {
        console.error('[server-sms] Africa\'s Talking error:', e);
        return { ok: false, reason: e?.message || 'Network error' };
    }
}

/**
 * Send SMS via Advanta Africa when configured, otherwise Africa's Talking.
 * Used by webhooks where there's no signed-in user — e.g. M-Pesa callback,
 * Paystack webhook. Falls through gracefully when keys are missing.
 */
export async function sendServerSms(to: string, message: string): Promise<{ ok: boolean; reason?: string }> {
    if (!to || !message) return { ok: false, reason: 'Missing to/message' };

    if (isAdvantaConfigured()) {
        const result = await sendAdvantaSms(to, message);
        if (!result.ok) {
            console.warn(`[server-sms] Advanta did not send to ${to}: ${result.reason}`);
        }
        return result;
    }

    if (!process.env.AFRICASTALKING_API_KEY) {
        console.warn(`[server-sms] SMS provider missing — would send to ${to}: ${message.slice(0, 80)}...`);
        return { ok: false, reason: 'SMS provider is not configured' };
    }

    return sendAfricaTalkingSms(to, message);
}

/**
 * Send email via SMTP (Nodemailer). Same pattern as sendServerSms — used
 * directly by webhooks. Falls through if SMTP not configured.
 */
export async function sendServerEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; reason?: string }> {
    if (!to || !subject || !html) return { ok: false, reason: 'Missing fields' };

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || '"Mel-Agri" <noreply@melagri.com>';

    if (!smtpHost || !smtpUser || !smtpPass) {
        console.warn(`[server-email] SMTP not configured — would email ${to}: ${subject}`);
        return { ok: false, reason: 'SMTP not configured' };
    }

    try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: { user: smtpUser, pass: smtpPass },
        });
        await transporter.sendMail({ from: fromEmail, to, subject, html });
        return { ok: true };
    } catch (e: any) {
        console.error('[server-email] error:', e);
        return { ok: false, reason: e?.message || 'Send failed' };
    }
}
