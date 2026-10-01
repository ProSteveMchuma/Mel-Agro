import test from 'node:test';
import assert from 'node:assert/strict';
import { STAFF_PROFILES } from '../src/lib/admin-permissions.ts';
import {
    WHATSAPP_STAFF_ORDER,
    customerCreateBlock,
    customersMatchingPhone,
    mpesaControlVisibility,
    paymentLinkSms,
    paymentPromptAccess,
    reminderBlockReason,
    stkRetryBody,
} from '../src/lib/whatsapp-order.ts';

test('phone search matches an existing customer across Kenyan formats', () => {
    const customers = [
        { id: 'existing', phone: '+254712345678', status: 'active', name: 'Amina' },
        { id: 'other', phone: '+254700000000', status: 'active', name: 'Other' },
    ];
    const found = customersMatchingPhone(customers, '0712345678');
    assert.deepEqual(found.map((customer) => customer.id), ['existing']);
    assert.equal(customerCreateBlock(found), 'exists');
    assert.equal(customerCreateBlock([]), null);
});

test('a new WhatsApp number is not matched, and a suspended account blocks a second profile', () => {
    assert.deepEqual(customersMatchingPhone([{ id: 'a', phone: '+254712345678', status: 'active' }], '0799000111'), []);
    const suspended = customersMatchingPhone(
        [{ id: 'held', phone: '0712345678', status: 'suspended' }],
        '+254712345678',
    );
    assert.equal(customerCreateBlock(suspended), 'suspended');
});

test('staff WhatsApp orders use M-Pesa so the prompt controls show', () => {
    assert.equal(WHATSAPP_STAFF_ORDER.paymentMethod, 'M-Pesa');
    assert.equal(WHATSAPP_STAFF_ORDER.paymentStatus, 'Unpaid');
    assert.equal(WHATSAPP_STAFF_ORDER.status, 'Pending Payment');
    assert.equal(WHATSAPP_STAFF_ORDER.orderChannel, 'whatsapp');
    assert.deepEqual(mpesaControlVisibility(WHATSAPP_STAFF_ORDER.paymentMethod), { isMpesa: true, isStk: true });
    assert.deepEqual(mpesaControlVisibility('Manual'), { isMpesa: false, isStk: false });
    assert.equal(mpesaControlVisibility('M-Pesa Till (ABC123)').isMpesa, true);
    assert.equal(mpesaControlVisibility('M-Pesa Till (ABC123)').isStk, false);
});

test('STK retry is sent to the WhatsApp number', () => {
    assert.deepEqual(stkRetryBody('order123', '0712345678'), {
        orderId: 'order123',
        phoneNumber: '+254712345678',
    });
    assert.equal(stkRetryBody('order123', '254712345678').phoneNumber, '+254712345678');
});

test('pay-link SMS includes the order, short link, and till', () => {
    const message = paymentLinkSms({
        userName: 'Amina',
        orderId: 'abcde12345',
        items: [{ name: 'DAP 50kg', quantity: 2 }],
        total: 5400,
        payUrl: 'https://www.melagri.com/o/pay12xyz',
        tillNumber: '3130847',
    });
    assert.match(message, /Habari Amina/);
    assert.match(message, /#ABCDE/);
    assert.match(message, /DAP 50kg x2/);
    assert.match(message, /5,400|5400/);
    assert.match(message, /https:\/\/www\.melagri\.com\/o\/pay12xyz/);
    assert.match(message, /Till 3130847/);
    assert.doesNotMatch(message, /wa\.me/);
});

test('payment reminder is rejected once the order is paid', () => {
    assert.match(reminderBlockReason('Paid') || '', /already paid/i);
    assert.equal(reminderBlockReason('Unpaid'), null);
    assert.match(reminderBlockReason('Refunded') || '', /refunded/i);
});

test('support can prompt but cannot verify or record a till payment', () => {
    const support = paymentPromptAccess('admin', STAFF_PROFILES.support.permissions);
    assert.equal(support.canPrompt, true);
    assert.equal(support.canVerify, false);
    const operations = paymentPromptAccess('admin', STAFF_PROFILES.operations.permissions);
    assert.equal(operations.canPrompt, true);
    assert.equal(operations.canVerify, true);
    const analyst = paymentPromptAccess('admin', STAFF_PROFILES.analyst.permissions);
    assert.equal(analyst.canPrompt, false);
    assert.equal(analyst.canVerify, false);
});
