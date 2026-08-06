import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

test('keeps product writes restricted to administrators', () => {
    assert.match(rules, /match \/products\/\{productId\}[\s\S]*?allow read: if true;[\s\S]*?allow write: if isAdmin\(\);/);
});

test('prevents clients from writing payment-system collections', () => {
    for (const collection of ['c2bPayments', 'refunds', 'mpesaConfig', 'paystackWebhookEvents', 'discountUsage']) {
        const block = rules.match(new RegExp(`match /${collection}/\\{id\\} \\{([\\s\\S]*?)\\n    \\}`));
        assert.ok(block, `Missing rules block for ${collection}`);
        assert.match(block[1], /allow write: if false;/, `${collection} must remain server-write-only`);
    }
});

test('keeps carts and wishlists owner-scoped', () => {
    assert.match(rules, /match \/carts\/\{userId\}[\s\S]*?request\.auth\.uid == userId/);
    assert.match(rules, /match \/wishlist\/\{wishlistId\}[\s\S]*?request\.auth\.uid == wishlistId/);
});
