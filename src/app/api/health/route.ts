import { NextResponse } from 'next/server';
import { getEnvironmentReadiness } from '@/lib/env-readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
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
