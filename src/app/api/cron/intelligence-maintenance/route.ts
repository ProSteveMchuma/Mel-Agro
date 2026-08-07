import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { INTELLIGENCE_RETENTION_DAYS } from '@/lib/experimentation';
import { runAutomations } from '@/lib/automation-engine';

const MAX_DELETIONS_PER_COLLECTION = 400;

async function deleteExpired(collectionName: string, timestampField: string, days: number): Promise<number> {
    const cutoff = new Date(Date.now() - days * 86_400_000);
    const snapshot = await adminDb.collection(collectionName).where(timestampField, '<', cutoff).limit(MAX_DELETIONS_PER_COLLECTION).get();
    if (snapshot.empty) return 0;
    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    return snapshot.size;
}

export async function GET(request: Request) {
    const expected = process.env.CRON_SECRET;
    const provided = request.headers.get('authorization');
    if (!expected || provided !== `Bearer ${expected}`) {
        return NextResponse.json({ success: false, message: 'Unauthorized scheduled task' }, { status: 401 });
    }

    const deleted = {
        visitDeduplication: await deleteExpired('analytics_visit_dedup', 'createdAt', INTELLIGENCE_RETENTION_DAYS.visitDeduplication),
        recommendationAggregates: await deleteExpired('analytics_recommendations', 'lastEventAt', INTELLIGENCE_RETENTION_DAYS.recommendationAggregates),
        searchAggregates: await deleteExpired('analytics_search_terms', 'lastSearched', INTELLIGENCE_RETENTION_DAYS.searchAggregates),
        purchaseReconciliation: await deleteExpired('analytics_purchases', 'timestamp', INTELLIGENCE_RETENTION_DAYS.purchaseReconciliation),
        actionOutcomes: await deleteExpired('intelligence_alerts', 'updatedAt', INTELLIGENCE_RETENTION_DAYS.actionOutcomes),
    };
    const automations = await runAutomations('scheduled:intelligence-maintenance');
    return NextResponse.json({ success: true, deleted, automations, maxPerCollection: MAX_DELETIONS_PER_COLLECTION, completedAt: new Date().toISOString() });
}
