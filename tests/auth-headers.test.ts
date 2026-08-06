import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticatedJsonHeaders } from '../src/lib/auth-headers.ts';

test('keeps the pinned guest token on payment requests', () => {
    assert.deepEqual(authenticatedJsonHeaders('guest-id-token'), {
        'Content-Type': 'application/json',
        Authorization: 'Bearer guest-id-token',
    });
});

test('refuses to build an unauthenticated payment request', () => {
    assert.throws(() => authenticatedJsonHeaders('  '), /valid authentication token/i);
});
