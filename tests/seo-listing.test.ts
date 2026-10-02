import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogueListingMeta } from '../src/lib/seo.ts';
import { COMPANY_LOCALITY, SITE_DESCRIPTION } from '../src/lib/site.ts';
import { kenyaOfferShippingDetails } from '../src/lib/shipping-schema.ts';

test('filtered catalogue canonicals point at the landing page', () => {
    assert.deepEqual(catalogueListingMeta({ category: 'Crop Protection Products' }), {
        canonical: '/categories/crop-protection-products',
        index: false,
    });
    assert.deepEqual(catalogueListingMeta({ brand: 'Bayer Crop Science' }), {
        canonical: '/brands/bayer-crop-science',
        index: false,
    });
    assert.equal(catalogueListingMeta({ search: 'maize' }).canonical, '/products?search=maize');
    assert.equal(catalogueListingMeta({ search: 'maize' }).index, false);
    assert.deepEqual(catalogueListingMeta({}), { canonical: '/products', index: true });
});

test('shop description and shipping offers name Machakos and a price', () => {
    assert.equal(COMPANY_LOCALITY, 'Machakos');
    assert.match(SITE_DESCRIPTION, /Machakos/);
    assert.ok(SITE_DESCRIPTION.length <= 160);
    const details = kenyaOfferShippingDetails();
    assert.ok(details.length >= 6);
    assert.ok(details.every((item) => item.shippingRate.currency === 'KES' && item.shippingRate.value > 0));
});
