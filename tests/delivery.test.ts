import assert from 'node:assert/strict';
import test from 'node:test';
import { DELIVERY_ZONES, KENYAN_COUNTIES, KENYAN_TOWNS, OTHER_TOWN, composeShippingTown, findKenyanTown, getDeliveryCost, splitShippingTown } from '../src/lib/delivery.ts';

test('contains every Kenyan county exactly once across configured regions', () => {
    assert.equal(KENYAN_COUNTIES.length, 47);
    assert.equal(new Set(KENYAN_COUNTIES).size, 47);

    const configured = DELIVERY_ZONES.flatMap((zone) => zone.regions).filter((region) => region !== 'Other');
    assert.deepEqual([...configured].sort(), [...KENYAN_COUNTIES].sort());
});

test('maps town aliases and normalizes county punctuation', () => {
    assert.equal(getDeliveryCost('Eldoret', 0).zoneName, 'Rift Valley');
    assert.equal(getDeliveryCost('Muranga', 0).zoneName, 'Central Region');
    assert.equal(getDeliveryCost("Murang'a", 0).cost, 350);
});

test('applies free shipping at the threshold without changing ETA', () => {
    const result = getDeliveryCost('Mombasa', 10_000);
    assert.equal(result.cost, 0);
    assert.equal(result.zoneName, 'Free Shipping');
    assert.equal(result.etaText, '2–3 business days');
});

test('uses the fallback zone for unknown locations', () => {
    const result = getDeliveryCost('Unknown place', 0);
    assert.equal(result.zoneName, 'Rest of Kenya');
    assert.equal(result.cost, 750);
});

test('lists Naivasha as a town priced through Nakuru county', () => {
    const naivasha = findKenyanTown('Naivasha');
    assert.deepEqual(naivasha, { town: 'Naivasha', county: 'Nakuru' });
    assert.equal(getDeliveryCost(naivasha!.county, 0).zoneName, 'Rift Valley');
    assert.equal(getDeliveryCost('Naivasha', 0).zoneName, 'Rift Valley');
});

test('every listed town maps to a real county and names are unique', () => {
    const names = KENYAN_TOWNS.map((t) => t.town.toLowerCase());
    assert.equal(new Set(names).size, names.length);
    for (const t of KENYAN_TOWNS) assert.ok(KENYAN_COUNTIES.includes(t.county), `${t.town} -> ${t.county}`);
    // Every county has at least one town to pick.
    for (const county of KENYAN_COUNTIES) assert.ok(KENYAN_TOWNS.some((t) => t.county === county), county);
});

test('towns never shadow county names in fee lookup', () => {
    // "Kisii" is both a town and a county; county pricing must win.
    assert.equal(getDeliveryCost('Kisii', 0).zoneName, 'Western & Nyanza');
    assert.equal(getDeliveryCost('Nairobi', 0).zoneName, 'Nairobi Region');
});

test('composes and splits the stored town string', () => {
    assert.equal(composeShippingTown('Naivasha', ''), 'Naivasha');
    assert.equal(composeShippingTown('Naivasha', 'Kabati'), 'Kabati, Naivasha');
    assert.equal(composeShippingTown('Naivasha', 'naivasha'), 'naivasha');
    assert.equal(composeShippingTown(OTHER_TOWN, 'Kinangop'), 'Kinangop');

    assert.deepEqual(splitShippingTown('Kabati, Naivasha', 'Nakuru'), { deliveryTown: 'Naivasha', area: 'Kabati' });
    assert.deepEqual(splitShippingTown('Westlands', 'Nairobi'), { deliveryTown: 'Westlands', area: '' });
    assert.deepEqual(splitShippingTown('Kinangop', 'Nyandarua'), { deliveryTown: OTHER_TOWN, area: 'Kinangop' });
    assert.deepEqual(splitShippingTown('', undefined), { deliveryTown: '', area: '' });
});
