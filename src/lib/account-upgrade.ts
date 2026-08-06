export function normalizeKenyanPhone(raw: string): string {
    const digits = raw.replace(/[^\d+]/g, '');
    if (/^0[17]\d{8}$/.test(digits)) return `+254${digits.slice(1)}`;
    if (/^254[17]\d{8}$/.test(digits)) return `+${digits}`;
    if (/^\+254[17]\d{8}$/.test(digits)) return digits;
    throw new Error('Enter a valid Kenyan phone number');
}

export const ACCOUNT_UPGRADE_EVENTS = [
    'account_prompt_shown',
    'account_prompt_accepted',
    'account_prompt_declined',
    'account_upgrade_completed',
    'account_upgrade_failed',
] as const;

export type AccountUpgradeEvent = typeof ACCOUNT_UPGRADE_EVENTS[number];
