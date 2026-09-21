import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

test('keeps product writes restricted to catalogue-capable administrators', () => {
    assert.match(rules, /match \/products\/\{productId\}[\s\S]*?allow read: if true;[\s\S]*?allow write: if hasPermission\('catalogue\.manage'\);/);
});

test('enforces granular capabilities while preserving legacy administrators', () => {
    assert.match(rules, /function hasPermission\(permission\)/);
    assert.match(rules, /!account\.keys\(\)\.hasAny\(\['adminPermissions'\]\)/);
    assert.match(rules, /permission in account\.adminPermissions/);
    assert.match(rules, /match \/orders\/\{orderId\}[\s\S]*?allow create: if hasPermission\('orders\.manage'\)/);
    assert.match(rules, /match \/users\/\{userId\}[\s\S]*?hasPermission\('customers\.manage'\)/);
});

test('blocks client escalation of staff privilege fields on users', () => {
    const block = rules.match(/match \/users\/\{userId\} \{([\s\S]*?)\n    \}/);
    assert.ok(block, 'Missing users rules block');
    assert.match(block[1], /adminPermissions/);
    assert.match(block[1], /staffProfile/);
    assert.match(
        block[1],
        /hasAny\(\['role',\s*'adminPermissions',\s*'staffProfile'\]\)/,
        'customers.manage updates must not change privilege fields',
    );
    assert.match(
        block[1],
        /hasAny\(\['role',\s*'status',\s*'loyaltyPoints',\s*'adminPermissions',\s*'staffProfile'\]\)/,
        'self-updates must not change privilege fields',
    );
});

test('prevents clients from writing payment-system collections', () => {
    for (const collection of ['c2bPayments', 'refunds', 'mpesaConfig', 'paystackWebhookEvents', 'discountUsage']) {
        const block = rules.match(new RegExp(`match /${collection}/\\{id\\} \\{([\\s\\S]*?)\\n    \\}`));
        assert.ok(block, `Missing rules block for ${collection}`);
        assert.match(block[1], /allow write: if false;/, `${collection} must remain server-write-only`);
    }
});

test('keeps intelligence aggregates server-authoritative', () => {
    for (const collection of ['analytics_purchases', 'analytics_recommendations', 'analytics_visit_dedup', 'intelligence_alerts']) {
        const block = rules.match(new RegExp(`match /${collection}/\\{id\\} \\{([\\s\\S]*?)\\n    \\}`));
        assert.ok(block, `Missing rules block for ${collection}`);
        assert.match(block[1], /allow write: if false;/, `${collection} must remain server-write-only`);
    }
});

test('keeps carts and wishlists owner-scoped', () => {
    assert.match(rules, /match \/carts\/\{userId\}[\s\S]*?request\.auth\.uid == userId/);
    assert.match(rules, /match \/wishlist\/\{wishlistId\}[\s\S]*?request\.auth\.uid == wishlistId/);
});

test('keeps newsletter subscriptions server-authoritative', () => {
    const block = rules.match(/match \/newsletterSubscriptions\/\{id\} \{([\s\S]*?)\n    \}/);
    assert.ok(block, 'Missing newsletterSubscriptions rules block');
    assert.match(block[1], /allow create: if false;/);
    assert.match(block[1], /allow read, update, delete: if isAdmin\(\);/);
});

test('keeps the admin audit log server-authoritative', () => {
    const block = rules.match(/match \/adminAuditLog\/\{id\} \{([\s\S]*?)\n    \}/);
    assert.ok(block, 'Missing adminAuditLog rules block');
    assert.match(block[1], /allow write: if false;/);
    assert.match(block[1], /allow read: if isAdmin\(\);/);
});

test('keeps automation configuration and run history server-authoritative', () => {
    for (const collection of ['automationRules', 'automationRuns']) {
        const block = rules.match(new RegExp(`match /${collection}/\\{id\\} \\{([\\s\\S]*?)\\n    \\}`));
        assert.ok(block, `Missing rules block for ${collection}`);
        assert.match(block[1], /allow read, write: if false;/);
    }
});

test('keeps per-admin analytics preferences server-authoritative', () => {
    const block = rules.match(/match \/adminAnalyticsPreferences\/\{id\} \{([\s\S]*?)\n    \}/);
    assert.ok(block, 'Missing adminAnalyticsPreferences rules block');
    assert.match(block[1], /allow read, write: if false;/);
});

test('keeps login OTP challenges server-authoritative', () => {
    const block = rules.match(/match \/otpChallenges\/\{id\} \{([\s\S]*?)\n    \}/);
    assert.ok(block, 'Missing otpChallenges rules block');
    assert.match(block[1], /allow read, write: if false;/);
});
