import test from 'node:test';
import assert from 'node:assert/strict';
import { CORE_ENV_KEYS, PRODUCTION_ENV_GROUPS, getEnvironmentReadiness } from '../src/lib/env-readiness.ts';

function completeEnvironment() {
    const env: Record<string, string> = {};
    for (const key of CORE_ENV_KEYS) env[key] = key === 'NEXT_PUBLIC_BASE_URL' ? 'https://www.melagri.com' : `configured-${key}`;
    for (const keys of Object.values(PRODUCTION_ENV_GROUPS)) {
        for (const key of keys) env[key] = `configured-${key}`;
    }
    env.MPESA_ENV = 'production';
    env.MPESA_DISABLE_IP_CHECK = 'false';
    return env;
}

test('accepts a complete production configuration', () => {
    assert.equal(getEnvironmentReadiness(completeEnvironment(), true).ready, true);
});

test('reports missing values without exposing configured secrets', () => {
    const env = completeEnvironment();
    delete env.FIREBASE_PRIVATE_KEY;
    const result = getEnvironmentReadiness(env, true);
    assert.equal(result.ready, false);
    assert.deepEqual(result.missingCore, ['FIREBASE_PRIVATE_KEY']);
    assert.equal(JSON.stringify(result).includes(env.PAYSTACK_SECRET_KEY), false);
});

test('rejects insecure production payment configuration', () => {
    const env = completeEnvironment();
    env.MPESA_ENV = 'sandbox';
    env.MPESA_DISABLE_IP_CHECK = 'true';
    const result = getEnvironmentReadiness(env, true);
    assert.equal(result.ready, false);
    assert.equal(result.issues.length, 2);
});
