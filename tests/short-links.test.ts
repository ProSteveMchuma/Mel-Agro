import test from 'node:test';
import assert from 'node:assert/strict';
import {
    generateShortLinkCode,
    isValidShortLinkCode,
    shortOrderLinkUrl,
} from '../src/lib/short-link-format.ts';

test('generateShortLinkCode uses safe alphabet and fixed length', () => {
    const code = generateShortLinkCode(8);
    assert.equal(code.length, 8);
    assert.match(code, /^[23456789abcdefghijkmnpqrstuvwxyz]+$/);
    assert.equal(code.includes('o'), false);
    assert.equal(code.includes('l'), false);
    assert.equal(code.includes('1'), false);
    assert.equal(code.includes('0'), false);
});

test('shortOrderLinkUrl builds /o/{code} on SITE_URL', () => {
    const url = shortOrderLinkUrl('ab12cd34');
    assert.match(url, /\/o\/ab12cd34$/);
    assert.ok(url.startsWith('http'));
});

test('isValidShortLinkCode accepts opaque codes only', () => {
    assert.equal(isValidShortLinkCode('ab12cd34'), true);
    assert.equal(isValidShortLinkCode('../x'), false);
    assert.equal(isValidShortLinkCode(''), false);
});

test('short links are much shorter than signed deep links', () => {
    const short = shortOrderLinkUrl('ab12cd34');
    const longExample = 'https://www.melagri.com/orders/abcde12345xyzpaytoken/pay?t=abcde12345xyzpaytoken.pay.1700000000000.712345678.abcdefghijklmnopqrstuv';
    assert.ok(short.length < 60);
    assert.ok(short.length < longExample.length / 2);
});
