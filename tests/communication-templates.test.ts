import test from 'node:test';
import assert from 'node:assert/strict';
import { CommunicationTemplates } from '../src/lib/communication-templates.ts';
import { withActionUrls } from '../src/lib/order-access.ts';

const order = {
    id: 'abcde12345',
    userId: 'user-1',
    userName: 'Amina',
    phone: '0712345678',
    total: 2500,
    shippingCost: 0,
    paymentMethod: 'M-Pesa',
    status: 'Pending Payment',
    date: '2026-09-10T00:00:00.000Z',
    items: [{ id: 'p1', name: 'Seed', price: 2500, quantity: 1 }],
    shippingAddress: { county: 'Nairobi', details: 'Westlands' },
} as any;

const signed = withActionUrls(order);

test('awaiting-payment SMS is for unpaid orders, not dispatch', () => {
    const sms = CommunicationTemplates.getAwaitingPayment(order).smsBody;
    assert.match(sms, /#ABCDE/);
    assert.match(sms, /awaiting payment/i);
    assert.equal(sms.includes('dispatch'), false);
});

test('payment received SMS includes amount and receipt', () => {
    const sms = CommunicationTemplates.getPaymentReceived(order, { receipt: 'TJK7H8K9L0', method: 'M-Pesa' }).smsBody;
    assert.match(sms, /KES 2,?500/);
    assert.match(sms, /TJK7H8K9L0/);
    assert.match(sms, /packing/i);
});

test('status SMS copy is specific for shipped, delivered, and collection', () => {
    assert.match(CommunicationTemplates.getStatusUpdate(order, 'Shipped').smsBody, /on the way/);
    assert.match(CommunicationTemplates.getStatusUpdate(order, 'Delivered').smsBody, /has been delivered/);
    assert.match(CommunicationTemplates.getStatusUpdate(order, 'Processing').smsBody, /packing/);
    assert.match(CommunicationTemplates.getStatusUpdate(order, 'Cancelled').smsBody, /cancelled/);
    assert.match(CommunicationTemplates.getStatusUpdate(order, 'Ready for Collection').smsBody, /ready for collection/i);
    assert.match(CommunicationTemplates.getStatusUpdate(order, 'Collected').smsBody, /was collected/i);
});

test('customer SMS uses unsigned deep-link paths by default', () => {
    assert.match(CommunicationTemplates.getAwaitingPayment(order).smsBody, /Pay here: /);
    assert.match(CommunicationTemplates.getAwaitingPayment(order).smsBody, /\/orders\/abcde12345\/pay(?!\?)/);
    assert.match(CommunicationTemplates.getPaymentReceived(order, { receipt: 'TJK7H8K9L0' }).smsBody, /\/orders\/abcde12345(?!\?)/);
    assert.match(CommunicationTemplates.getStatusUpdate(order, 'Shipped').smsBody, /\/orders\/abcde12345(?![/\w])/);
    assert.match(CommunicationTemplates.getOrderConfirmation(order).smsBody, /\/orders\/abcde12345(?!\?)/);
    assert.match(CommunicationTemplates.getPaymentReminder(order).smsBody, /\/orders\/abcde12345\/pay(?!\?)/);
    assert.match(CommunicationTemplates.getReturnUpdate(order, 'Approved').smsBody, /\/orders\/abcde12345\/return(?!\?)/);
    assert.match(CommunicationTemplates.getReturnRequested(order).smsBody, /\/orders\/abcde12345\/return(?!\?)/);
});

test('server-signed action URLs appear in SMS when withActionUrls is used', () => {
    assert.match(CommunicationTemplates.getAwaitingPayment(signed).smsBody, /\/orders\/abcde12345\/pay\?t=/);
    assert.match(CommunicationTemplates.getPaymentReceived(signed, { receipt: 'TJK7H8K9L0' }).smsBody, /\/orders\/abcde12345\?t=/);
    assert.match(CommunicationTemplates.getStatusUpdate(signed, 'Shipped').smsBody, /\/orders\/abcde12345\?t=/);
    assert.match(CommunicationTemplates.getOrderConfirmation(signed).smsBody, /\/orders\/abcde12345\?t=/);
    assert.match(CommunicationTemplates.getPaymentReminder(signed).smsBody, /\/orders\/abcde12345\/pay\?t=/);
    assert.match(CommunicationTemplates.getReturnUpdate(signed, 'Approved').smsBody, /\/orders\/abcde12345\/return\?t=/);
    assert.match(CommunicationTemplates.getReturnRequested(signed).smsBody, /\/orders\/abcde12345\/return\?t=/);
});
