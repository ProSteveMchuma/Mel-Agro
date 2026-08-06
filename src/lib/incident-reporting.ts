export type IncidentType = 'payment_failure' | 'callback_error' | 'notification_failure' | 'traffic_anomaly';
export type IncidentSeverity = 'warning' | 'critical';

export interface Incident {
    type: IncidentType;
    severity: IncidentSeverity;
    source: string;
    message: string;
    metadata?: Record<string, unknown>;
}

const lastSent = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 5 * 60_000;
const SENSITIVE_KEY = /authorization|cookie|token|secret|password|private|api[-_]?key|phone|email/i;

export function redactIncidentMetadata(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(redactIncidentMetadata);
    if (!value || typeof value !== 'object') return value;

    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactIncidentMetadata(nested),
    ]));
}

export async function reportIncident(incident: Incident): Promise<void> {
    const safeIncident = {
        ...incident,
        metadata: redactIncidentMetadata(incident.metadata || {}),
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    };

    console.error(JSON.stringify({ event: 'melagri_incident', ...safeIncident }));

    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl || process.env.NODE_ENV !== 'production') return;

    const fingerprint = `${incident.type}:${incident.source}:${incident.message}`;
    const now = Date.now();
    if ((lastSent.get(fingerprint) || 0) > now - DEDUPLICATION_WINDOW_MS) return;
    lastSent.set(fingerprint, now);

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(process.env.ALERT_WEBHOOK_TOKEN
                    ? { Authorization: `Bearer ${process.env.ALERT_WEBHOOK_TOKEN}` }
                    : {}),
            },
            body: JSON.stringify(safeIncident),
            signal: AbortSignal.timeout(5_000),
        });
    } catch (error) {
        console.error('[incident-reporting] webhook delivery failed', error instanceof Error ? error.message : 'unknown error');
    }
}
