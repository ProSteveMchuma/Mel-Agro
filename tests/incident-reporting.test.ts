import test from 'node:test';
import assert from 'node:assert/strict';

test('incident metadata redaction hides nested credentials and contact data', async () => {
    const { redactIncidentMetadata } = await import('../src/lib/incident-reporting.ts');
    const result = redactIncidentMetadata({
        orderId: 'order-123',
        authorization: 'Bearer secret',
        nested: { phone: '+254700000000', resultCode: '1032' },
    });
    assert.deepEqual(result, {
        orderId: 'order-123',
        authorization: '[REDACTED]',
        nested: { phone: '[REDACTED]', resultCode: '1032' },
    });
});
