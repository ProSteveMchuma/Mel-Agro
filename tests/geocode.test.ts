import assert from 'node:assert/strict';
import test from 'node:test';
import { mapNominatimResult, matchKenyanCounty } from '../src/lib/geocode.ts';

test('matchKenyanCounty normalizes County suffix and aliases', () => {
    assert.equal(matchKenyanCounty('Nairobi County'), 'Nairobi');
    assert.equal(matchKenyanCounty('Uasin Gishu'), 'Uasin Gishu');
    assert.equal(matchKenyanCounty("Murang'a"), "Murang'a");
    assert.equal(matchKenyanCounty('Unknownia'), undefined);
});

test('mapNominatimResult extracts Kenya place fields', () => {
    const mapped = mapNominatimResult({
        place_id: 99,
        display_name: 'Westlands, Nairobi, Nairobi County, Kenya',
        lat: '-1.267',
        lon: '36.811',
        address: {
            city_district: 'Westlands',
            city: 'Nairobi',
            state: 'Nairobi County',
            road: 'Waiyaki Way',
            house_number: '12',
        },
    }, 0);

    assert.ok(mapped);
    assert.equal(mapped?.county, 'Nairobi');
    assert.equal(mapped?.town, 'Westlands');
    assert.equal(mapped?.street, '12 Waiyaki Way');
    assert.equal(mapped?.lat, -1.267);
    assert.equal(mapped?.lng, 36.811);
});
