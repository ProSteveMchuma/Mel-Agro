import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeZoneInput, shippingZonesConfigSchema, validateShippingCoverage } from '../src/lib/shipping-zones-admin.ts';

test('normalizeZoneInput fills missing isFallback and etaText', () => {
  const zone = normalizeZoneInput(
    {
      id: 'nairobi',
      name: 'Nairobi Region',
      regions: ['Nairobi'],
      price: 200,
      etaMinDays: 0,
      etaMaxDays: 1,
    },
    0,
  );
  assert.equal(zone.isFallback, false);
  assert.ok(zone.etaText.length >= 2);
  assert.equal(zone.freeShippingThreshold, 0);
});

test('duplicate counties no longer block coverage validation', () => {
  const zones = [
    normalizeZoneInput(
      { id: 'a', name: 'Zone Alpha', regions: ['Nairobi'], price: 100, etaMinDays: 0, etaMaxDays: 1, isFallback: false, order: 1 },
      0,
    ),
    normalizeZoneInput(
      { id: 'b', name: 'Zone Beta', regions: ['Nairobi', 'Kiambu'], price: 150, etaMinDays: 1, etaMaxDays: 2, isFallback: true, order: 2 },
      1,
    ),
  ];
  assert.equal(validateShippingCoverage(zones), null);
  assert.equal(shippingZonesConfigSchema.safeParse({ version: 1, zones }).success, true);
});
