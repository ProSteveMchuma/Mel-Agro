export const NAIROBI_TZ = "Africa/Nairobi";

function asDate(value: Date | string | number): Date {
    return value instanceof Date ? value : new Date(value);
}

function part(date: Date, type: Intl.DateTimeFormatPartTypes, options: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat("en-GB", { timeZone: NAIROBI_TZ, ...options })
        .formatToParts(date)
        .find((item) => item.type === type)?.value || "";
}

/** Calendar day in Africa/Nairobi as YYYY-MM-DD. */
export function nairobiDateKey(value: Date | string | number = new Date()): string {
    const date = asDate(value);
    if (!Number.isFinite(date.getTime())) return "";
    const year = part(date, "year", { year: "numeric" });
    const month = part(date, "month", { month: "2-digit" });
    const day = part(date, "day", { day: "2-digit" });
    return `${year}-${month}-${day}`;
}

/** Move a Nairobi calendar day by a whole number of days. */
export function shiftNairobiDay(isoDay: string, days: number): string {
    const noon = new Date(`${isoDay}T12:00:00+03:00`);
    if (!Number.isFinite(noon.getTime())) return isoDay;
    return nairobiDateKey(new Date(noon.getTime() + days * 86400000));
}

export function nairobiDayLabel(isoDay: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return isoDay || "—";
    const date = new Date(`${isoDay}T12:00:00+03:00`);
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: NAIROBI_TZ,
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(date);
}

/** Sortable Africa/Nairobi stamp: YYYY-MM-DD HH:mm. */
export function nairobiDateTimeStamp(value?: string | number | Date | null): string {
    if (value == null || value === "") return "";
    const date = asDate(value);
    if (!Number.isFinite(date.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: NAIROBI_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour").padStart(2, "0")}:${get("minute").padStart(2, "0")}`;
}

export function nairobiHour(value: Date | string | number): number {
    const date = asDate(value);
    if (!Number.isFinite(date.getTime())) return 0;
    const hour = Number(part(date, "hour", { hour: "2-digit", hourCycle: "h23" }));
    return Number.isFinite(hour) ? hour % 24 : 0;
}

/** 0 Sunday … 6 Saturday in Africa/Nairobi. */
export function nairobiWeekdayIndex(value: Date | string | number): number {
    const date = asDate(value);
    if (!Number.isFinite(date.getTime())) return 0;
    const name = new Intl.DateTimeFormat("en-US", { timeZone: NAIROBI_TZ, weekday: "short" }).format(date);
    const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
    return index < 0 ? 0 : index;
}

/** Monday-anchored week key (YYYY-MM-DD) in Africa/Nairobi. */
export function nairobiWeekStartKey(value: Date | string | number): string {
    const key = nairobiDateKey(value);
    if (!key) return "";
    const weekday = nairobiWeekdayIndex(new Date(`${key}T12:00:00+03:00`));
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
    return shiftNairobiDay(key, mondayOffset);
}

export function nairobiMonthKey(value: Date | string | number): string {
    return nairobiDateKey(value).slice(0, 7);
}

export function defaultNairobiRange(daysBack = 30, now = new Date()): { start: string; end: string } {
    const end = nairobiDateKey(now);
    return { start: shiftNairobiDay(end, -daysBack), end };
}
