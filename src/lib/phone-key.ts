/** Last 9 digits of a phone, used to match Kenyan numbers without pulling in order tokens. */
export function phoneAccessKey(raw?: string | null): string {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length < 9) return '';
    return digits.slice(-9);
}
