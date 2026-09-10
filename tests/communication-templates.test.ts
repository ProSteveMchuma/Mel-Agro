import test from 'node:test';
import assert from 'node:assert/strict';
import { CommunicationTemplates } from '../src/lib/communication-templates.ts';

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

test('status SMS copy is specific for shipped and delivered', () => {
    assert.match(CommunicationTemplates.getStatusUpdate(order, 'Shipped').smsBody, /on the way/);
    assert.match(CommunicationTemplates.getStatusUpdate(order, 'Delivered').smsBody, /has been delivered/);
    assert.match(CommunicationTemplates.getStatusUpdate(order, 'Processing').smsBody, /packing/);
    assert.match(CommunicationTemplates.getStatusUpdate(order, 'Cancelled').smsBody, /cancelled/);
});

test('customer SMS includes a dashboard link for the order', () => {
    const link = 'https://www.melagri.com/dashboard/user?tab=orders&orderId=abcde12345';
    assert.match(CommunicationTemplates.getAwaitingPayment(order).smsBody, /Pay here: /);
    assert.ok(CommunicationTemplates.getAwaitingPayment(order).smsBody.includes(link));
    assert.ok(CommunicationTemplates.getPaymentReceived(order, { receipt: 'TJK7H8K9L0' }).smsBody.includes(link));
    assert.ok(CommunicationTemplates.getStatusUpdate(order, 'Shipped').smsBody.includes(link));
    assert.ok(CommunicationTemplates.getOrderConfirmation(order).smsBody.includes(link));
    assert.ok(CommunicationTemplates.getPaymentReminder(order).smsBody.includes(link));
    assert.match(CommunicationTemplates.getReturnUpdate(order, 'Approved').smsBody, /tab=returns/);
    assert.match(CommunicationTemplates.getReturnRequested(order).smsBody, /tab=returns/);
});
