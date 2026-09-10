export const ADVANTA_BASE_URL = 'https://quicksms.advantasms.com';

/** Approved Advanta sender ID / shortcode. Override with ADVANTA_SENDER_ID. */
export const DEFAULT_ADVANTA_SENDER_ID = 'Makamithi';

type Env = Record<string, string | undefined>;

export interface AdvantaSendResult {
    ok: boolean;
    reason?: string;
    messageId?: string;
}

interface AdvantaRecipientResponse {
    'response-code'?: number;
    'respose-code'?: number;
    'response-description'?: string;
    messageid?: string | number;
    mobile?: string | number;
}

interface AdvantaSendPayload {
    responses?: AdvantaRecipientResponse[];
    'response-code'?: number;
    'response-description'?: string;
}

export function formatAdvantaMobile(raw: string): string {
    let phone = (raw || '').replace(/[\s-]/g, '').replace(/^\+/, '');
    if (phone.startsWith('0')) phone = `254${phone.slice(1)}`;
    else if (phone.startsWith('7') && phone.length === 9) phone = `254${phone}`;
    else if (!phone.startsWith('254') && phone.length >= 9) phone = `254${phone.replace(/^254/, '')}`;
    return phone;
}

export function getAdvantaConfig(env: Env = process.env) {
    const apiKey = env.ADVANTA_API_KEY?.trim() || '';
    const partnerID = env.ADVANTA_PARTNER_ID?.trim() || '';
    const shortcode = env.ADVANTA_SENDER_ID?.trim()
        || env.AFRICASTALKING_SENDER_ID?.trim()
        || DEFAULT_ADVANTA_SENDER_ID;
    return { apiKey, partnerID, shortcode };
}

export function isAdvantaConfigured(env: Env = process.env): boolean {
    const { apiKey, partnerID, shortcode } = getAdvantaConfig(env);
    return Boolean(apiKey && partnerID && shortcode);
}

export function parseAdvantaSendResponse(data: AdvantaSendPayload): AdvantaSendResult {
    const recipients = Array.isArray(data?.responses) ? data.responses : [];
    const first = recipients[0];
    const code = Number(first?.['response-code'] ?? first?.['respose-code'] ?? data?.['response-code']);
    const description = first?.['response-description'] || data?.['response-description'] || 'Provider rejected';

    if (code === 200) {
        return {
            ok: true,
            messageId: first?.messageid != null ? String(first.messageid) : undefined,
        };
    }

    return { ok: false, reason: description };
}

export async function sendAdvantaSms(to: string, message: string, env: Env = process.env): Promise<AdvantaSendResult> {
    if (!to || !message) return { ok: false, reason: 'Missing to/message' };

    const { apiKey, partnerID, shortcode } = getAdvantaConfig(env);
    if (!apiKey || !partnerID) return { ok: false, reason: 'Advanta credentials not configured' };
    if (!shortcode) return { ok: false, reason: 'Advanta sender ID not configured' };

    try {
        const res = await fetch(`${ADVANTA_BASE_URL}/api/services/sendsms/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                apikey: apiKey,
                partnerID,
                message,
                shortcode,
                mobile: formatAdvantaMobile(to),
            }),
        });
        const data: AdvantaSendPayload = await res.json().catch(() => ({}));
        const parsed = parseAdvantaSendResponse(data);
        if (!parsed.ok) {
            console.warn('[advanta-sms] provider rejected message:', parsed.reason);
        }
        return parsed;
    } catch (error) {
        const reason = error instanceof Error ? error.message : 'Network error';
        console.error('[advanta-sms] error:', reason);
        return { ok: false, reason };
    }
}
