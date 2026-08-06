import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCOUNT_UPGRADE_EVENTS, normalizeKenyanPhone } from '../src/lib/account-upgrade.ts';

test('normalizes supported Kenyan phone formats for account linking', () => {
    assert.equal(normalizeKenyanPhone('0712 345 678'), '+254712345678');
    assert.equal(normalizeKenyanPhone('254712345678'), '+254712345678');
    assert.equal(normalizeKenyanPhone('+254712345678'), '+254712345678');
});

test('rejects invalid account-upgrade phone numbers', () => {
    assert.throws(() => normalizeKenyanPhone('12345'), /valid Kenyan phone number/);
});

test('keeps account conversion analytics free of personal fields', () => {
    assert.deepEqual(ACCOUNT_UPGRADE_EVENTS, [
        'account_prompt_shown',
        'account_prompt_accepted',
        'account_prompt_declined',
        'account_upgrade_completed',
        'account_upgrade_failed',
    ]);
});
