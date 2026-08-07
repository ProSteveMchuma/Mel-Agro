import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreCartRecovery } from '../src/lib/recovery-intelligence.ts';

test('high intent cart is scored but requires explicit consent', () => {
    const score = scoreCartRecovery({ total: 12000, idleMinutes: 90, checkoutStep: 'payment', paymentAttempted: true, hasPhone: true, consent: false });
    assert.equal(score.priority, 'high');
    assert.equal(score.contactEligible, false);
    assert.match(score.blockedReason || '', /not opted/);
});

test('recovery contact cooldown prevents repeated messaging', () => {
    const score = scoreCartRecovery({ total: 5000, idleMinutes: 180, hasPhone: true, consent: true, hoursSinceLastContact: 24 });
    assert.equal(score.contactEligible, false);
    assert.match(score.blockedReason || '', /cooldown/);
});
