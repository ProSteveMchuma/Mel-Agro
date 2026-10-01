import { NextResponse } from 'next/server';
import { getEnvironmentReadiness } from '@/lib/env-readiness';

export const dynamic = 'force-dynamic';

/**
 * Ops readiness probe. Requires CRON_SECRET so public scanners cannot map
 * which integrations are misconfigured.
 */
export async function GET(request: Request) {
    const expected = process.env.CRON_SECRET;
    const provided = request.headers.get('authorization');
    if (!expected || provided !== `Bearer ${expected}`) {
        return NextResponse.json({ status: 'unauthorized' }, { status: 401 });
    }

    const production = process.env.NODE_ENV === 'production';
    const readiness = getEnvironmentReadiness(process.env, production);

    return NextResponse.json(
        {
            status: readiness.ready ? 'ready' : 'not_ready',
            core: readiness.coreReady ? 'configured' : 'missing_configuration',
            integrations: readiness.productionReady ? 'configured' : 'missing_configuration',
            timestamp: new Date().toISOString(),
        },
        {
            status: readiness.ready ? 200 : 503,
            headers: { 'Cache-Control': 'no-store' },
        },
    );
}
