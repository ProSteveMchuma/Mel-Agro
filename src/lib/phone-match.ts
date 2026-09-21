import { normalizeKenyanPhone } from './account-upgrade.ts';
import { phoneAccessKey } from './order-access.ts';

/** Phone strings commonly stored on Mel-Agri orders / user docs. */
export function phoneQueryVariants(raw: string): string[] {
    let e164 = '';
    try {
        e164 = normalizeKenyanPhone(raw);
    } catch {
        const digits = String(raw || '').replace(/\D/g, '');
        if (digits.length < 9) return [];
        e164 = `+254${digits.slice(-9)}`;
    }
    const national09 = `0${e164.slice(-9)}`;
    const digits254 = e164.replace(/\D/g, '');
    const last9 = e164.slice(-9);
    return [...new Set([
        e164,
        national09,
        digits254,
        last9,
        `254${last9}`,
        `+254${last9}`,
    ])];
}

export function orderPhoneKey(raw?: string | null): string {
    return phoneAccessKey(raw);
}
