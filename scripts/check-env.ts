import { getEnvironmentReadiness } from '../src/lib/env-readiness.ts';

const production = process.argv.includes('--production');
const readiness = getEnvironmentReadiness(process.env, production);

console.log(`Environment preflight: ${readiness.ready ? 'READY' : 'NOT READY'}`);

if (readiness.missingCore.length) {
    console.error(`Missing core variables: ${readiness.missingCore.join(', ')}`);
}

if (production) {
    for (const [service, missing] of Object.entries(readiness.missingByService)) {
        if (missing.length) console.error(`${service}: missing ${missing.join(', ')}`);
    }
}

for (const issue of readiness.issues) console.error(`Configuration issue: ${issue}`);

if (!readiness.ready) process.exitCode = 1;
