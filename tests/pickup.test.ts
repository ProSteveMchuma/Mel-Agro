import test from 'node:test';
import assert from 'node:assert/strict';
import {
    awardsLoyaltyOnStatus,
    fulfillmentMethodOf,
    fulfillmentStepsFor,
    isActiveFulfillmentStatus,
    isPickupOrder,
    nextFulfillmentStatus,
    statusLabelForOrder,
} from '../src/lib/pickup.ts';

test('isPickupOrder detects pickup and collection methods', () => {
    assert.equal(isPickupOrder({ shippingMethod: 'pickup' }), true);
    assert.equal(isPickupOrder({ shippingAddress: { method: 'collection' } }), true);
    assert.equal(isPickupOrder({ shippingMethod: 'standard' }), false);
    assert.equal(fulfillmentMethodOf({ shippingMethod: 'pickup' }), 'pickup');
    assert.equal(fulfillmentMethodOf({ shippingMethod: 'standard' }), 'delivery');
});

test('pickup and delivery use distinct fulfillment steps', () => {
    assert.deepEqual(fulfillmentStepsFor({ shippingMethod: 'pickup' }), [
        'Processing',
        'Ready for Collection',
        'Collected',
    ]);
    assert.deepEqual(fulfillmentStepsFor({ shippingMethod: 'standard' }), [
        'Processing',
        'Shipped',
        'Delivered',
    ]);
});

test('nextFulfillmentStatus advances pickup and delivery correctly', () => {
    assert.equal(nextFulfillmentStatus({ status: 'Processing', shippingMethod: 'pickup' }), 'Ready for Collection');
    assert.equal(nextFulfillmentStatus({ status: 'Ready for Collection', shippingMethod: 'pickup' }), 'Collected');
    assert.equal(nextFulfillmentStatus({ status: 'Shipped', shippingMethod: 'pickup' }), 'Collected');
    assert.equal(nextFulfillmentStatus({ status: 'Collected', shippingMethod: 'pickup' }), null);
    assert.equal(nextFulfillmentStatus({ status: 'Processing', shippingMethod: 'standard' }), 'Shipped');
    assert.equal(nextFulfillmentStatus({ status: 'Shipped', shippingMethod: 'standard' }), 'Delivered');
});

test('status labels and loyalty helpers treat collection as complete', () => {
    const pickup = { shippingMethod: 'pickup' };
    assert.equal(statusLabelForOrder('Ready for Collection', pickup), 'Ready for collection');
    assert.equal(statusLabelForOrder('Collected', pickup), 'Collected');
    assert.equal(statusLabelForOrder('Shipped', pickup), 'Ready for collection');
    assert.equal(statusLabelForOrder('Processing', pickup), 'Preparing for collection');
    assert.equal(statusLabelForOrder('Processing'), 'Preparing your order');
    assert.equal(statusLabelForOrder('Shipped'), 'Out for delivery');
    assert.equal(statusLabelForOrder('Pending Payment'), 'Awaiting payment');
    assert.equal(awardsLoyaltyOnStatus('Collected'), true);
    assert.equal(awardsLoyaltyOnStatus('Delivered'), true);
    assert.equal(isActiveFulfillmentStatus('Ready for Collection'), true);
    assert.equal(isActiveFulfillmentStatus('Collected'), false);
});
