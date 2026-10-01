import test from 'node:test';
import assert from 'node:assert/strict';
import {
    DEFAULT_STAFF_ORDER_ALERT_PHONE,
    parseStaffOrderAlertPhone,
    resolveStaffOrderAlertPhone,
    staffOrderAlertMessage,
} from '../src/lib/staff-order-alert.ts';

test('staff alert phone defaults to the saved Kenyan number', () => {
    assert.equal(DEFAULT_STAFF_ORDER_ALERT_PHONE, '+254714657108');
    assert.equal(resolveStaffOrderAlertPhone(undefined), '+254714657108');
    assert.equal(resolveStaffOrderAlertPhone(''), '+254714657108');
    assert.equal(resolveStaffOrderAlertPhone('not-a-phone'), '+254714657108');
});

test('staff alert phone accepts Kenyan formats and rejects others', () => {
    assert.equal(parseStaffOrderAlertPhone('+254 714 657108'), '+254714657108');
    assert.equal(parseStaffOrderAlertPhone('0714657108'), '+254714657108');
    assert.equal(parseStaffOrderAlertPhone('254714657108'), '+254714657108');
    assert.throws(() => parseStaffOrderAlertPhone('12345'), /Kenyan phone/);
    assert.throws(() => parseStaffOrderAlertPhone('+1 202 555 0100'), /Kenyan phone/);
});

test('staff alert SMS names the order, customer, and admin link', () => {
    const message = staffOrderAlertMessage({
        id: 'abcde12345',
        userName: 'Amina',
        phone: '0714657108',
        total: 5400,
        paymentStatus: 'Unpaid',
        paymentMethod: 'M-Pesa',
        shippingMethod: 'standard',
        shippingAddress: { county: 'Machakos', method: 'standard' },
    });
    assert.match(message, /#ABCDE/);
    assert.match(message, /Amina/);
    assert.match(message, /0714657108/);
    assert.match(message, /Machakos/);
    assert.match(message, /Unpaid M-Pesa/);
    assert.match(message, /5,400|5400/);
    assert.match(message, /\/dashboard\/admin\/orders\/abcde12345/);
    assert.doesNotMatch(message, /Pay here/);
});

test('pickup orders say Machakos pickup', () => {
    const message = staffOrderAlertMessage({
        id: 'pickup1',
        userName: 'Otieno',
        phone: '+254714657108',
        total: 800,
        paymentStatus: 'Unpaid',
        paymentMethod: 'Cash on Delivery',
        shippingMethod: 'pickup',
        shippingAddress: { county: 'Machakos', method: 'pickup' },
    });
    assert.match(message, /Machakos pickup/);
    assert.match(message, /Unpaid Cash on Delivery/);
});
