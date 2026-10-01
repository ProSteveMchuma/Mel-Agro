const NAIROBI_OFFSET = "+03:00";

/** Inclusive Africa/Nairobi calendar days, as UTC instants for an order `date` query. */
export function nairobiRangeUtc(startDate: string, endDate: string): { start: Date; endExclusive: Date } {
    const start = new Date(`${startDate}T00:00:00${NAIROBI_OFFSET}`);
    const endDay = new Date(`${endDate}T00:00:00${NAIROBI_OFFSET}`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(endDay.getTime())) {
        throw new Error("INVALID_RANGE");
    }
    return { start, endExclusive: new Date(endDay.getTime() + 24 * 60 * 60 * 1000) };
}
