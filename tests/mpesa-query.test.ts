import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutIdsToQuery, decideMpesaCallback, decideMpesaQueryWrite, isDarajaSuccessCode, isMpesaPaidCode, isStkQueryInFlight, isValidMpesaReceipt, normalizeMpesaReceipt, paymentSmsPhone, resolveStkQueryProbes } from '../src/lib/mpesa.ts';

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

test('treats numeric and string Daraja success the same', () => {
    assert.equal(isDarajaSuccessCode(0), true);
    assert.equal(isDarajaSuccessCode('0'), true);
    assert.equal(isMpesaPaidCode(0), true);
    assert.equal(isMpesaPaidCode('0'), true);
    assert.equal(isMpesaPaidCode(1032), false);
});

test('a paid PIN after a failed prompt marks the same order paid', () => {
    const failedOrder = {
        paymentStatus: 'Failed',
        status: 'Pending Payment',
        checkoutRequestId: 'ws_retry',
        total: 1500,
        mpesaReceiptNumber: null,
    };
    assert.equal(decideMpesaCallback({
        order: failedOrder,
        checkoutRequestId: 'ws_retry',
        resultCode: '0',
        callbackEventId: 'ws_retry-0',
        amountPaid: 1500,
        receipt: 'TJK7H8K9L0',
    }).action, 'mark-paid');
    assert.equal(decideMpesaCallback({
        order: failedOrder,
        checkoutRequestId: 'ws_retry',
        resultCode: 0,
        callbackEventId: 'ws_retry-0',
        amountPaid: 1500,
        receipt: 'TJK7H8K9L0',
    }).action, 'mark-paid');
});

test('an older failed prompt does not put a later attempt back to waiting', () => {
    assert.equal(decideMpesaCallback({
        order: {
            paymentStatus: 'Unpaid',
            checkoutRequestId: 'ws_retry',
            total: 1500,
        },
        checkoutRequestId: 'ws_old',
        resultCode: 1032,
        callbackEventId: 'ws_old-1032',
        amountPaid: 0,
        receipt: '',
    }).action, 'ignore');
    assert.equal(decideMpesaCallback({
        order: {
            paymentStatus: 'Paid',
            checkoutRequestId: 'ws_retry',
            total: 1500,
            mpesaReceiptNumber: 'TJK7H8K9L0',
        },
        checkoutRequestId: 'ws_old',
        resultCode: '1032',
        callbackEventId: 'ws_old-1032',
        amountPaid: 0,
        receipt: '',
    }).action, 'ignore');
});

test('the current prompt can still be recorded as failed', () => {
    assert.equal(decideMpesaCallback({
        order: {
            paymentStatus: 'Unpaid',
            checkoutRequestId: 'ws_retry',
            total: 1500,
        },
        checkoutRequestId: 'ws_retry',
        resultCode: 1032,
        callbackEventId: 'ws_retry-1032',
        amountPaid: 0,
        receipt: '',
    }).action, 'mark-failed');
});

test('a status query marks a failed order paid when the retry succeeded', () => {
    assert.equal(decideMpesaQueryWrite({
        paymentStatus: 'Failed',
        checkoutRequestId: 'ws_retry',
        outcome: 'paid',
        resultCheckoutRequestId: 'ws_retry',
    }), 'mark-paid');
    assert.equal(decideMpesaQueryWrite({
        paymentStatus: 'Unpaid',
        checkoutRequestId: 'ws_retry',
        outcome: 'failed',
        resultCheckoutRequestId: 'ws_old',
    }), 'none');
    assert.equal(decideMpesaQueryWrite({
        paymentStatus: 'Unpaid',
        checkoutRequestId: 'ws_retry',
        outcome: 'failed',
        resultCheckoutRequestId: 'ws_retry',
    }), 'mark-failed');
    assert.equal(decideMpesaQueryWrite({
        paymentStatus: 'Paid',
        checkoutRequestId: 'ws_retry',
        outcome: 'failed',
        resultCheckoutRequestId: 'ws_old',
    }), 'none');
});

test('prefers the retry that was paid over the earlier cancel', () => {
    const resolved = resolveStkQueryProbes([
        { checkoutRequestId: 'ws_old', resultCode: '1032', resultDesc: 'cancelled', data: { ResultCode: '1032' } },
        { checkoutRequestId: 'ws_retry', resultCode: '0', resultDesc: 'ok', data: { ResultCode: 0 } },
    ]);
    assert.equal(resolved.outcome, 'paid');
    assert.equal(resolved.checkoutRequestId, 'ws_retry');
});
