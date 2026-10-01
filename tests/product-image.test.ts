import assert from 'node:assert/strict';
import test from 'node:test';
import { skipImageOptimizer } from '../src/lib/product-image.ts';

test('firebase and other remote product photos skip the optimizer', () => {
    assert.equal(skipImageOptimizer('https://firebasestorage.googleapis.com/v0/b/melagri.firebasestorage.app/o/products%2Fa.jpg?alt=media&token=abc'), true);
    assert.equal(skipImageOptimizer('https://melagri.firebasestorage.app/products/a.jpg'), true);
    assert.equal(skipImageOptimizer('https://placehold.co/400x400?text=No+Image'), true);
    assert.equal(skipImageOptimizer('  http://example.com/pack.jpg  '), true);
});

test('local shop art still uses the optimizer', () => {
    assert.equal(skipImageOptimizer('/images/kenyan-farmer-banner.png'), false);
    assert.equal(skipImageOptimizer('/assets/partners/bayer.png'), false);
    assert.equal(skipImageOptimizer('/assets/images/placeholder.png'), false);
    assert.equal(skipImageOptimizer(''), false);
    assert.equal(skipImageOptimizer(null), false);
});
