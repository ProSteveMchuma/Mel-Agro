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

test('treats SMS as ready when Africa\'s Talking is configured instead of Advanta', () => {
    const env = completeEnvironment();
    delete env.ADVANTA_API_KEY;
    delete env.ADVANTA_PARTNER_ID;
    env.AFRICASTALKING_API_KEY = 'configured-at-key';
    env.AFRICASTALKING_USERNAME = 'melagri';
    const result = getEnvironmentReadiness(env, true);
    assert.equal(result.ready, true);
    assert.deepEqual(result.missingByService.sms, []);
});

test('accepts OTP_PEPPER as order-access secret fallback', () => {
    const env = completeEnvironment();
    delete env.ORDER_ACCESS_SECRET;
    env.OTP_PEPPER = 'configured-otp-pepper';
    const result = getEnvironmentReadiness(env, true);
    assert.equal(result.ready, true);
    assert.deepEqual(result.missingByService.orderAccess, []);
});
