import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_AUTOMATION_RULES, normalizeAutomationRule } from '../src/lib/automation-rules.ts';

test('automation defaults require human review for customer recovery', () => {
  const payment = DEFAULT_AUTOMATION_RULES.find((rule) => rule.key === 'payment_recovery');
  const cart = DEFAULT_AUTOMATION_RULES.find((rule) => rule.key === 'abandoned_cart');
  assert.equal(payment?.mode, 'assisted');
  assert.equal(cart?.mode, 'assisted');
  assert.equal(cart?.enabled, true);
});

test('automation thresholds are bounded and modes are allowlisted', () => {
  const fallback = DEFAULT_AUTOMATION_RULES[0];
  assert.equal(normalizeAutomationRule({ threshold: 0, mode: 'assisted' }, fallback).threshold, fallback.threshold);
  assert.equal(normalizeAutomationRule({ threshold: 999999 }, fallback).threshold, 10080);
  assert.equal(normalizeAutomationRule({ mode: 'unknown' as never }, fallback).mode, 'alert_only');
});
