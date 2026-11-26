import assert from 'node:assert/strict';
import test from 'node:test';
import { truncateMetaDescription } from '../src/lib/seo.ts';
import { CASH_ON_DELIVERY_ENABLED, cashOnDeliveryAllowed } from '../src/lib/payment-options.ts';

test('short meta descriptions are left alone', () => {
    assert.equal(truncateMetaDescription('  Buy seeds   online. '), 'Buy seeds online.');
});

test('long meta descriptions never end mid-word', () => {
    const text = 'Browse planting, top-dressing, foliar, and specialty fertilizer products from the Mel-Agri catalogue and compare them by pack size and price before choosing a manufacturer for your farm today';
    const out = truncateMetaDescription(text);
    assert.ok(out.length <= 158, `too long: ${out.length}`);
    assert.ok(out.endsWith('…'));
    const lastWord = out.slice(0, -1).split(' ').pop()!;
    assert.ok(text.split(' ').includes(lastWord), `cut word: ${lastWord}`);
});

test('long meta descriptions prefer a full sentence', () => {
    const first = 'Find registered crop-protection products in the live catalogue and compare product type, pack size, brand, and availability.';
    const out = truncateMetaDescription(`${first} Product selection must be based on the target pest and the label instructions for each crop.`);
    assert.equal(out, first);
});

test('cash on delivery is paused except for fully discounted orders', () => {
    assert.equal(CASH_ON_DELIVERY_ENABLED, false);
    assert.equal(cashOnDeliveryAllowed(1500), false);
    assert.equal(cashOnDeliveryAllowed(0), true);
});
