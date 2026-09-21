/** Same rules as slugifySeoValue — kept local so Node tests can import this module. */
function slugifyKey(value: string): string {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Display-safe cleanup: Unicode normalize, trim, collapse spaces, strip trailing punctuation. */
export function normalizeDisplayField(val: unknown): string {
    if (val === null || val === undefined) return '';
    return String(val)
        .normalize('NFKC')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[.,;:]+$/g, '')
        .trim();
}

/** Stable key for brand / category matching (case, spacing, hyphen insensitive). */
export function taxonomyKeyFrom(val: unknown): string {
    const display = normalizeDisplayField(val);
    if (!display) return '';
    return slugifyKey(display);
}

export function brandKeyFrom(val: unknown): string {
    return taxonomyKeyFrom(val);
}

export function categoryKeyFrom(val: unknown): string {
    return taxonomyKeyFrom(val);
}

/** Prefer an existing display name that shares this key; otherwise return cleaned input. */
export function resolveCanonicalBrand(input: unknown, knownDisplays: string[]): string {
    const cleaned = normalizeDisplayField(input);
    if (!cleaned) return '';
    const key = brandKeyFrom(cleaned);
    const match = knownDisplays.find((b) => brandKeyFrom(b) === key);
    return match || cleaned;
}

/**
 * Collapse raw brand strings into one canonical display per brandKey.
 * Picks the most frequent spelling (ties → localeCompare).
 */
export function collapseBrandDisplays(
    entries: Array<{ brand?: string | null; brandKey?: string | null }>
): string[] {
    const groups = new Map<string, Map<string, number>>();

    for (const entry of entries) {
        const display = normalizeDisplayField(entry.brand);
        if (!display) continue;
        const key = normalizeDisplayField(entry.brandKey) || brandKeyFrom(display);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, new Map());
        const spellings = groups.get(key)!;
        spellings.set(display, (spellings.get(display) || 0) + 1);
    }

    const result: Array<{ brand: string; count: number }> = [];
    for (const spellings of groups.values()) {
        let best = '';
        let bestCount = -1;
        let bestScore = -1;
        for (const [spelling, count] of spellings) {
            // Prefer mixed/Title case, then ALL CAPS, then lowercase on ties
            const score =
                spelling !== spelling.toLowerCase() && spelling !== spelling.toUpperCase()
                    ? 2
                    : spelling === spelling.toUpperCase()
                      ? 1
                      : 0;
            if (
                count > bestCount ||
                (count === bestCount && score > bestScore) ||
                (count === bestCount && score === bestScore && spelling.localeCompare(best) < 0)
            ) {
                best = spelling;
                bestCount = count;
                bestScore = score;
            }
        }
        if (best) result.push({ brand: best, count: bestCount });
    }

    return result
        .sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand))
        .map((row) => row.brand);
}

function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i += 1) {
        let prev = i - 1;
        row[0] = i;
        for (let j = 1; j <= b.length; j += 1) {
            const cur = row[j];
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
            prev = cur;
        }
    }
    return row[b.length];
}

/** Same key or very close key → suggest the existing brand display name. */
export function findNearDuplicateBrand(input: unknown, knownDisplays: string[]): string | null {
    const cleaned = normalizeDisplayField(input);
    if (!cleaned) return null;
    const key = brandKeyFrom(cleaned);
    if (!key) return null;

    for (const known of knownDisplays) {
        if (brandKeyFrom(known) === key && normalizeDisplayField(known) !== cleaned) {
            return known;
        }
    }

    const threshold = key.length <= 5 ? 1 : 2;
    let best: string | null = null;
    let bestDist = Infinity;
    for (const known of knownDisplays) {
        const knownKey = brandKeyFrom(known);
        if (!knownKey || knownKey === key) continue;
        const dist = levenshtein(key, knownKey);
        if (dist > 0 && dist <= threshold && dist < bestDist) {
            best = known;
            bestDist = dist;
        }
    }
    return best;
}

export function productBrandFields(brandInput: unknown, knownDisplays: string[] = []) {
    const brand = resolveCanonicalBrand(brandInput, knownDisplays);
    const brandKey = brandKeyFrom(brand);
    return { brand, brandKey: brandKey || '' };
}
