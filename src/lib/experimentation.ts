export type ExperimentVariant = 'control' | 'treatment';

export interface ExperimentDefinition {
    id: string;
    treatmentPercent: number;
    primaryMetric: string;
    guardrails: string[];
}

export const PERSONALIZED_HOME_EXPERIMENT: ExperimentDefinition = {
    id: 'personalized-home-v1',
    treatmentPercent: 50,
    primaryMetric: 'recommendation click-through rate',
    guardrails: ['add-to-cart rate', 'checkout completion', 'payment failure rate'],
};

export const INTELLIGENCE_RETENTION_DAYS = {
    visitDeduplication: 2,
    recommendationAggregates: 395,
    searchAggregates: 395,
    purchaseReconciliation: 730,
    actionOutcomes: 730,
} as const;

// FNV-1a gives a deterministic, dependency-free assignment. Including the
// experiment ID prevents one experiment's cohort from determining another's.
export function experimentBucket(experimentId: string, subjectKey: string): number {
    const input = `${experimentId}:${subjectKey}`;
    let hash = 0x811c9dc5;
    for (let index = 0; index < input.length; index += 1) {
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) % 100;
}

export function assignExperiment(definition: ExperimentDefinition, subjectKey: string): ExperimentVariant {
    if (!subjectKey.trim()) return 'control';
    const percent = Math.max(0, Math.min(100, definition.treatmentPercent));
    return experimentBucket(definition.id, subjectKey) < percent ? 'treatment' : 'control';
}
