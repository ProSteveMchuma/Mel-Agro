import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cartLineKey, mergeCartItems, resolveCartForAuthState } from '../src/lib/cart-merge.ts';
import type { CartItem } from '../src/types/index.ts';

function line(partial: Partial<CartItem> & { id: string; name: string; price: number; quantity: number }): CartItem {
    return {
        cartItemId: partial.cartItemId || String(partial.id),
        category: 'seeds',
        image: '',
        inStock: true,
        stockQuantity: partial.stockQuantity ?? 99,
        ...partial,
    } as CartItem;
}

test('cartLineKey prefers cartItemId then product-variant', () => {
    assert.equal(cartLineKey({ cartItemId: 'a-1', id: 'a' }), 'a-1');
    assert.equal(cartLineKey({ id: 'seed', selectedVariant: { id: '5kg' } }), 'seed-5kg');
    assert.equal(cartLineKey({ id: 'seed' }), 'seed');
});

test('mergeCartItems keeps unique lines from both carts', () => {
    const local = [line({ id: 'a', name: 'A', price: 100, quantity: 1 })];
    const cloud = [line({ id: 'b', name: 'B', price: 200, quantity: 2 })];
    const merged = mergeCartItems(local, cloud);
    assert.equal(merged.length, 2);
    assert.deepEqual(
        merged.map((item) => item.id).sort(),
        ['a', 'b'],
    );
});

test('mergeCartItems sums quantities for the same line and prefers local price', () => {
    const local = [line({ id: 'seed', name: 'Seed Local', price: 150, quantity: 2, stockQuantity: 10 })];
    const cloud = [line({ id: 'seed', name: 'Seed Cloud', price: 120, quantity: 3, stockQuantity: 10 })];
    const merged = mergeCartItems(local, cloud);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].quantity, 5);
    assert.equal(merged[0].price, 150);
    assert.equal(merged[0].name, 'Seed Local');
});

test('mergeCartItems caps summed quantity to known stock', () => {
    const local = [line({ id: 'seed', name: 'Seed', price: 100, quantity: 4, stockQuantity: 5 })];
    const cloud = [line({ id: 'seed', name: 'Seed', price: 100, quantity: 3, stockQuantity: 5 })];
    const merged = mergeCartItems(local, cloud);
    assert.equal(merged[0].quantity, 5);
});

test('mergeCartItems merges variant lines separately', () => {
    const local = [line({
        id: 'fert',
        cartItemId: 'fert-5kg',
        name: 'Fert 5kg',
        price: 500,
        quantity: 1,
        selectedVariant: { id: '5kg', name: '5kg', price: 500, stockQuantity: 8 } as any,
    })];
    const cloud = [line({
        id: 'fert',
        cartItemId: 'fert-10kg',
        name: 'Fert 10kg',
        price: 900,
        quantity: 1,
        selectedVariant: { id: '10kg', name: '10kg', price: 900, stockQuantity: 8 } as any,
    })];
    const merged = mergeCartItems(local, cloud);
    assert.equal(merged.length, 2);
});

test('resolveCartForAuthState does not double quantities on signed-in refresh', () => {
    const local = [line({ id: 'seed', name: 'Seed', price: 100, quantity: 2 })];
    const cloud = [line({ id: 'seed', name: 'Seed', price: 100, quantity: 2 })];
    const refreshed = resolveCartForAuthState({
        previousUserId: undefined,
        nextUserId: 'user-1',
        localItems: local,
        cloudItems: cloud,
    });
    assert.equal(refreshed.items.length, 1);
    assert.equal(refreshed.items[0].quantity, 2);
    assert.equal(refreshed.nextPreviousUserId, 'user-1');

    const again = resolveCartForAuthState({
        previousUserId: 'user-1',
        nextUserId: 'user-1',
        localItems: refreshed.items,
        cloudItems: cloud,
    });
    assert.equal(again.items[0].quantity, 2);
});

test('resolveCartForAuthState sum-merges when guest signs in', () => {
    const local = [line({ id: 'seed', name: 'Seed', price: 100, quantity: 2, stockQuantity: 20 })];
    const cloud = [line({ id: 'seed', name: 'Seed', price: 100, quantity: 3, stockQuantity: 20 })];
    const loggedIn = resolveCartForAuthState({
        previousUserId: null,
        nextUserId: 'user-1',
        localItems: local,
        cloudItems: cloud,
    });
    assert.equal(loggedIn.items[0].quantity, 5);
});

test('resolveCartForAuthState uses local only for guests', () => {
    const local = [line({ id: 'seed', name: 'Seed', price: 100, quantity: 4 })];
    const guest = resolveCartForAuthState({
        previousUserId: 'user-1',
        nextUserId: null,
        localItems: local,
        cloudItems: [line({ id: 'other', name: 'Other', price: 50, quantity: 9 })],
    });
    assert.equal(guest.items.length, 1);
    assert.equal(guest.items[0].id, 'seed');
    assert.equal(guest.nextPreviousUserId, null);
});

test('CartContext waits for auth and uses resolveCartForAuthState', () => {
    const source = readFileSync(join(process.cwd(), 'src/context/CartContext.tsx'), 'utf8');
    assert.match(source, /resolveCartForAuthState/);
    assert.match(source, /authLoading/);
    assert.match(source, /previousUserIdRef/);
});
