// Africa/Nairobi clock, same zone as nairobiPlacedLabel. Never the host's local zone.

export const NAIROBI_TIME_ZONE = 'Africa/Nairobi';

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type WeekdayLabel = (typeof WEEKDAY_LABELS)[number];

export interface NairobiClock {
    date: string;
    weekday: WeekdayLabel;
    weekdayIndex: number;
    hour: number;
    hourKey: string;
}

function nairobiParts(date: Date): Intl.DateTimeFormatPart[] {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: NAIROBI_TIME_ZONE,
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(date);
}

/** Hour, weekday, and calendar date in Africa/Nairobi. */
export function nairobiClock(value: Date | string | number | null | undefined): NairobiClock | null {
    const date = value instanceof Date ? value : new Date(String(value ?? ''));
    if (!Number.isFinite(date.getTime())) return null;
    const list = nairobiParts(date);
    const get = (type: string) => list.find((part) => part.type === type)?.value || '';
    const weekday = get('weekday') as WeekdayLabel;
    const weekdayIndex = WEEKDAY_LABELS.indexOf(weekday);
    let hour = Number(get('hour'));
    if (hour === 24) hour = 0;
    const year = get('year');
    const month = get('month');
    const day = get('day');
    if (!year || !month || !day || weekdayIndex < 0 || !Number.isInteger(hour) || hour < 0 || hour > 23) return null;
    return {
        date: `${year}-${month}-${day}`,
        weekday,
        weekdayIndex,
        hour,
        hourKey: String(hour).padStart(2, '0'),
    };
}

export interface VisitClockDoc {
    date?: string;
    weekday?: string;
    hours?: Record<string, unknown> | null;
}

export interface VisitClockBuckets {
    hours: Array<{ label: string; visits: number }>;
    weekdays: Array<{ label: string; visits: number }>;
}

/**
 * Sum hour counters written when each visit was recorded.
 * A day total with no hour keys adds nothing — those hours are not reconstructed.
 */
export function sumVisitClock(docs: VisitClockDoc[], fromDate?: string | null): VisitClockBuckets {
    const hours = Array.from({ length: 24 }, (_, hour) => ({
        label: `${String(hour).padStart(2, '0')}:00`,
        visits: 0,
    }));
    const weekdays = WEEKDAY_LABELS.map((label) => ({ label, visits: 0 }));
    for (const doc of docs) {
        const date = String(doc.date || '');
        if (fromDate && (!date || date < fromDate)) continue;
        const weekdayIndex = WEEKDAY_LABELS.indexOf(doc.weekday as WeekdayLabel);
        const hourMap = doc.hours && typeof doc.hours === 'object' ? doc.hours : {};
        for (const [key, raw] of Object.entries(hourMap)) {
            if (!/^(?:[01]\d|2[0-3])$/.test(key)) continue;
            const count = Math.max(0, Math.floor(Number(raw) || 0));
            if (!count) continue;
            hours[Number(key)].visits += count;
            if (weekdayIndex >= 0) weekdays[weekdayIndex].visits += count;
        }
    }
    return { hours, weekdays };
}
