import assert from 'node:assert/strict';
import test from 'node:test';
import { assignExperiment, experimentBucket, INTELLIGENCE_RETENTION_DAYS, PERSONALIZED_HOME_EXPERIMENT } from '../src/lib/experimentation.ts';

test('experiment assignment is stable for the same subject', () => {
    const first = assignExperiment(PERSONALIZED_HOME_EXPERIMENT, 'customer-123');
    assert.equal(assignExperiment(PERSONALIZED_HOME_EXPERIMENT, 'customer-123'), first);
    assert.equal(experimentBucket('a', 'b'), experimentBucket('a', 'b'));
});

test('experiment allocation honors disabled and full rollout', () => {
    assert.equal(assignExperiment({ ...PERSONALIZED_HOME_EXPERIMENT, treatmentPercent: 0 }, 'customer'), 'control');
    assert.equal(assignExperiment({ ...PERSONALIZED_HOME_EXPERIMENT, treatmentPercent: 100 }, 'customer'), 'treatment');
});

test('intelligence retention windows are explicit and bounded', () => {
    assert.equal(INTELLIGENCE_RETENTION_DAYS.visitDeduplication, 2);
    assert.ok(INTELLIGENCE_RETENTION_DAYS.recommendationAggregates <= 400);
    assert.ok(INTELLIGENCE_RETENTION_DAYS.actionOutcomes >= 365);
});
