import assert from 'node:assert/strict';
import test from 'node:test';
import { DELIVERY_ZONES, KENYAN_COUNTIES, getDeliveryCost } from '../src/lib/delivery.ts';

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
