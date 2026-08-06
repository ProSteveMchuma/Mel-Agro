import assert from 'node:assert/strict';
import test from 'node:test';
import { addressSchema, checkoutSchema, signupSchema } from '../src/lib/schemas.ts';

const validAddress = {
    fullName: 'Jane Wanjiku',
    email: 'jane@example.com',
    phone: '+254 712 345 678',
    county: 'Nairobi',
    town: 'Nairobi',
    address: 'Ngong Road, near the junction',
};

test('accepts supported Kenyan phone formats', () => {
    assert.equal(addressSchema.safeParse(validAddress).success, true);
    assert.equal(addressSchema.safeParse({ ...validAddress, phone: '0712345678' }).success, true);
});

test('rejects unknown counties and out-of-country coordinates', () => {
    assert.equal(addressSchema.safeParse({ ...validAddress, county: 'Other' }).success, false);
    assert.equal(addressSchema.safeParse({ ...validAddress, lat: 40, lng: -74 }).success, false);
});

test('rejects unsupported checkout payment methods', () => {
    const result = checkoutSchema.safeParse({
        shipping: validAddress,
        shippingMethod: 'standard',
        paymentMethod: 'crypto',
    });
    assert.equal(result.success, false);
});

test('enforces signup password strength and confirmation', () => {
    assert.equal(signupSchema.safeParse({ name: 'Jane', email: 'jane@example.com', password: 'weak', confirmPassword: 'weak' }).success, false);
    assert.equal(signupSchema.safeParse({ name: 'Jane', email: 'jane@example.com', password: 'StrongPass1', confirmPassword: 'Different1' }).success, false);
    assert.equal(signupSchema.safeParse({ name: 'Jane', email: 'jane@example.com', password: 'StrongPass1', confirmPassword: 'StrongPass1' }).success, true);
});
