import test from 'node:test';
import assert from 'node:assert/strict';
import { orderPhoneKey, phoneQueryVariants } from '../src/lib/phone-match.ts';

test('phoneQueryVariants covers common Kenyan formats', () => {
    const variants = phoneQueryVariants('0712345678');
    assert.ok(variants.includes('+254712345678'));
    assert.ok(variants.includes('0712345678'));
    assert.ok(variants.includes('254712345678'));
    assert.ok(variants.includes('712345678'));
});

test('orderPhoneKey matches order-access fingerprint', () => {
    assert.equal(orderPhoneKey('0712345678'), '712345678');
    assert.equal(orderPhoneKey('+254712345678'), '712345678');
    assert.equal(orderPhoneKey('254712345678'), '712345678');
});

test('rejects numbers that are too short', () => {
    assert.deepEqual(phoneQueryVariants('07123'), []);
    assert.equal(orderPhoneKey('123'), '');
});
