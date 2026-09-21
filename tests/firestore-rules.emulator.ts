import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test, { after, before, beforeEach } from 'node:test';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let environment: RulesTestEnvironment;

before(async () => {
    environment = await initializeTestEnvironment({
        projectId: 'demo-melagri-security',
        firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    });
});

beforeEach(async () => {
    await environment.clearFirestore();
    await environment.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'admin-user'), { role: 'admin', name: 'Admin' });
        await setDoc(doc(db, 'users', 'regular-user'), { role: 'user', name: 'Customer' });
        await setDoc(doc(db, 'products', 'seed-1'), { name: 'Maize Seed', price: 500 });
        await setDoc(doc(db, 'orders', 'order-1'), {
            userId: 'regular-user',
            total: 1200,
            paymentStatus: 'Unpaid',
            returnStatus: null,
        });
    });
});

after(async () => {
    await environment.cleanup();
});

test('catalog is public but product writes require a stored admin role', async () => {
    const anonymous = environment.unauthenticatedContext().firestore();
    const customer = environment.authenticatedContext('regular-user').firestore();
    const admin = environment.authenticatedContext('admin-user').firestore();

    await assertSucceeds(getDoc(doc(anonymous, 'products', 'seed-1')));
    await assertFails(setDoc(doc(customer, 'products', 'seed-2'), { name: 'Injected product' }));
    await assertSucceeds(setDoc(doc(admin, 'products', 'seed-2'), { name: 'Approved product' }));
});

test('an allowlisted-looking email cannot become admin without the database role', async () => {
    const impersonator = environment.authenticatedContext('impersonator', { email: 'admin@melagri.com' }).firestore();
    await assertFails(setDoc(doc(impersonator, 'products', 'seed-2'), { name: 'Injected product' }));
});

test('customers cannot create an elevated profile or change protected fields', async () => {
    const newUser = environment.authenticatedContext('new-user').firestore();
    const customer = environment.authenticatedContext('regular-user').firestore();

    await assertSucceeds(setDoc(doc(newUser, 'users', 'new-user'), { role: 'user', name: 'New Customer' }));
    await assertFails(setDoc(doc(newUser, 'users', 'attacker'), { role: 'user' }));
    await assertFails(setDoc(doc(newUser, 'users', 'new-user'), { role: 'admin' }));
    await assertFails(updateDoc(doc(customer, 'users', 'regular-user'), { role: 'admin' }));
    await assertFails(updateDoc(doc(customer, 'users', 'regular-user'), { loyaltyPoints: 999999 }));
    await assertFails(updateDoc(doc(customer, 'users', 'regular-user'), { adminPermissions: ['settings.manage'] }));
    await assertFails(updateDoc(doc(customer, 'users', 'regular-user'), { staffProfile: 'full' }));
});

test('restricted staff cannot self-escalate or rewrite privilege fields via Firestore client', async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'support-staff'), {
            role: 'admin',
            name: 'Support',
            adminPermissions: ['orders.manage', 'customers.manage'],
            staffProfile: 'support',
        });
    });

    const support = environment.authenticatedContext('support-staff').firestore();
    await assertFails(updateDoc(doc(support, 'users', 'support-staff'), {
        adminPermissions: ['orders.manage', 'customers.manage', 'settings.manage', 'catalogue.manage'],
    }));
    await assertFails(updateDoc(doc(support, 'users', 'support-staff'), { staffProfile: 'full' }));
    await assertFails(updateDoc(doc(support, 'users', 'support-staff'), { role: 'super-admin' }));
    await assertFails(updateDoc(doc(support, 'users', 'regular-user'), {
        adminPermissions: ['settings.manage'],
        staffProfile: 'full',
    }));
    await assertSucceeds(updateDoc(doc(support, 'users', 'regular-user'), { name: 'Updated Customer' }));
});

test('customers can request their own return but cannot alter totals or payment state', async () => {
    const owner = environment.authenticatedContext('regular-user').firestore();
    const stranger = environment.authenticatedContext('other-user').firestore();

    await assertSucceeds(getDoc(doc(owner, 'orders', 'order-1')));
    await assertFails(getDoc(doc(stranger, 'orders', 'order-1')));
    await assertSucceeds(updateDoc(doc(owner, 'orders', 'order-1'), {
        returnStatus: 'Requested',
        returnReason: 'Damaged package',
    }));
    await assertFails(updateDoc(doc(owner, 'orders', 'order-1'), { total: 1 }));
    await assertFails(updateDoc(doc(owner, 'orders', 'order-1'), { paymentStatus: 'Paid' }));
});

test('payment audit collections remain client-write protected', async () => {
    const admin = environment.authenticatedContext('admin-user').firestore();
    for (const collection of ['c2bPayments', 'refunds', 'mpesaConfig', 'paystackWebhookEvents', 'discountUsage']) {
        await assertFails(setDoc(doc(admin, collection, 'attempt'), { injected: true }));
    }
    assert.ok(true);
});
