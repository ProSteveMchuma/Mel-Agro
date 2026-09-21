import { randomBytes } from 'node:crypto';
import { SITE_URL } from './site.ts';

const CODE_ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz';
export const SHORT_LINK_CODE_LENGTH = 8;

/** Unambiguous alphabet (no 0/O/1/l) for SMS-friendly codes. */
export function generateShortLinkCode(length = SHORT_LINK_CODE_LENGTH): string {
    const bytes = randomBytes(length);
    let out = '';
    for (let i = 0; i < length; i += 1) {
        out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
    }
    return out;
}

export function shortOrderLinkUrl(code: string): string {
    return `${SITE_URL}/o/${encodeURIComponent(code)}`;
}

export function isValidShortLinkCode(code: string): boolean {
    return /^[a-z0-9]{6,16}$/.test(String(code || '').trim().toLowerCase());
}
