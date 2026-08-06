import { NextResponse } from 'next/server';
import { checkRateLimit, getClientAddress } from '@/lib/rate-limit';
import { reportIncident } from '@/lib/incident-reporting';

export function enforceRateLimit(
    request: Request,
    scope: string,
    limit: number,
    windowMs: number,
) {
    const result = checkRateLimit(`${scope}:${getClientAddress(request)}`, { limit, windowMs });
    if (result.allowed) return null;

    void reportIncident({
        type: 'traffic_anomaly',
        severity: 'warning',
        source: scope,
        message: 'API rate limit exceeded',
        metadata: { path: new URL(request.url).pathname, limit, windowMs },
    });

    return NextResponse.json(
        { success: false, message: 'Too many requests. Please try again shortly.' },
        {
            status: 429,
            headers: {
                'Retry-After': String(result.retryAfterSeconds),
                'X-RateLimit-Limit': String(result.limit),
                'X-RateLimit-Remaining': '0',
                'Cache-Control': 'no-store',
            },
        },
    );
}
