import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutIdsToQuery, isStkQueryInFlight, isValidMpesaReceipt, normalizeMpesaReceipt, paymentSmsPhone, resolveStkQueryProbes } from '../src/lib/mpesa.ts';

test('treats Safaricom in-flight query as pending', () => {
    assert.equal(isStkQueryInFlight({ errorCode: '500.001.1001' }), true);
    assert.equal(isStkQueryInFlight({ ResultCode: '500.001.1001' }), true);
    assert.equal(isStkQueryInFlight({}), true);
});

test('treats timeout and cancel as terminal, not pending', () => {
    assert.equal(isStkQueryInFlight({ ResultCode: '1037' }), false);
    assert.equal(isStkQueryInFlight({ ResultCode: 1032 }), false);
    assert.equal(isStkQueryInFlight({ ResultCode: '1' }), false);
});

test('treats ResultCode 0 as not in-flight', () => {
    assert.equal(isStkQueryInFlight({ ResultCode: '0' }), false);
});

test('keeps historic checkout request IDs when retry overwrites the current one', () => {
    assert.deepEqual(
        checkoutIdsToQuery(
            { checkoutRequestId: 'ws_new', checkoutRequestIds: ['ws_paid', 'ws_new'] },
            'ws_new',
        ),
        ['ws_new', 'ws_paid'],
    );
});

test('prefers a successful historic STK over a later timeout', () => {
    const resolved = resolveStkQueryProbes([
        { checkoutRequestId: 'ws_new', resultCode: '1037', resultDesc: 'timeout', data: { ResultCode: '1037' } },
        { checkoutRequestId: 'ws_paid', resultCode: '0', resultDesc: 'ok', data: { ResultCode: '0' } },
    ]);
    assert.equal(resolved.outcome, 'paid');
    assert.equal(resolved.checkoutRequestId, 'ws_paid');
});

test('keeps polling when any STK is still in flight', () => {
    const resolved = resolveStkQueryProbes([
        { checkoutRequestId: 'ws_new', resultCode: undefined, data: { errorCode: '500.001.1001' } },
        { checkoutRequestId: 'ws_old', resultCode: '1032', data: { ResultCode: '1032' } },
    ]);
    assert.equal(resolved.outcome, 'pending');
});

test('treats timeout as failed when no STK succeeded', () => {
    const resolved = resolveStkQueryProbes([
        { checkoutRequestId: 'ws_new', resultCode: '1037', resultDesc: 'timeout', data: { ResultCode: '1037' } },
    ]);
    assert.equal(resolved.outcome, 'failed');
    assert.equal(resolved.resultCode, '1037');
});

test('normalizes and validates M-Pesa receipt codes', () => {
    assert.equal(normalizeMpesaReceipt(' tjk7-h8k9 l0 '), 'TJK7H8K9L0');
    assert.equal(isValidMpesaReceipt('TJK7H8K9L0'), true);
    assert.equal(isValidMpesaReceipt('ABC'), false);
    assert.equal(isValidMpesaReceipt('not a code!!'), false);
});

test('prefers the paying M-Pesa phone for payment SMS', () => {
    assert.equal(paymentSmsPhone({ phone: '0711111111', mpesaPhoneNumber: '254722222222' }), '254722222222');
    assert.equal(paymentSmsPhone({ phone: '0711111111' }, '254733333333'), '254733333333');
    assert.equal(paymentSmsPhone({ phone: '0711111111' }), '0711111111');
});
