import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCartWriteQueue, shouldApplyLoadedCart } from '../src/lib/cart-write-queue.ts';

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

test('createCartWriteQueue runs writes in order so clear wins over a slow earlier persist', async () => {
    const queue = createCartWriteQueue();
    const log: string[] = [];

    void queue.enqueue(async () => {
        await delay(40);
        log.push('persist-big-cart');
    });
    void queue.enqueue(async () => {
        log.push('clear');
    });

    await queue.idle();
    assert.deepEqual(log, ['persist-big-cart', 'clear']);
});

test('createCartWriteQueue continues after a failed write', async () => {
    const queue = createCartWriteQueue();
    const log: string[] = [];

    void queue.enqueue(async () => {
        log.push('failing');
        throw new Error('network');
    });
    void queue.enqueue(async () => {
        log.push('after-failure');
    });

    await queue.idle();
    assert.deepEqual(log, ['failing', 'after-failure']);
});

test('shouldApplyLoadedCart blocks stale loads after local mutations', () => {
    assert.equal(shouldApplyLoadedCart({ loadGeneration: 3, currentGeneration: 3 }), true);
    assert.equal(shouldApplyLoadedCart({ loadGeneration: 3, currentGeneration: 5 }), false);
});

test('CartContext serialises cloud writes and converts via clearCart', () => {
    const source = readFileSync(join(process.cwd(), 'src/context/CartContext.tsx'), 'utf8');
    assert.match(source, /createCartWriteQueue/);
    assert.match(source, /shouldApplyLoadedCart/);
    assert.match(source, /mutationGenerationRef/);
    assert.match(source, /clearCart: \(options\?:/);
    assert.match(source, /status === 'converted'/);
});

test('checkout converts cart through clearCart instead of a racing setDoc', () => {
    const source = readFileSync(join(process.cwd(), 'src/app/checkout/page.tsx'), 'utf8');
    assert.match(source, /clearCart\(\{\s*status:\s*'converted'/);
    assert.doesNotMatch(source, /setDoc\(doc\(db,\s*'carts'/);
});
