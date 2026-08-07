import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requirePermission } from '@/lib/auth-server';
import { INTELLIGENCE_RETENTION_DAYS, PERSONALIZED_HOME_EXPERIMENT } from '@/lib/experimentation';

function timestampMs(value: any): number | null {
    if (value?.toMillis) return value.toMillis();
    const parsed = value ? new Date(value).getTime() : NaN;
    return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: Request) {
    const auth = await requirePermission(request, 'analytics.view');
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 401 });

    const [paidOrders, purchases, recommendationDocs, products, alerts, dedupExpired] = await Promise.all([
        adminDb.collection('orders').where('paymentStatus', '==', 'Paid').count().get(),
        adminDb.collection('analytics_purchases').count().get(),
        adminDb.collection('analytics_recommendations').limit(500).get(),
        adminDb.collection('products').limit(500).get(),
        adminDb.collection('intelligence_alerts').orderBy('updatedAt', 'desc').limit(1).get(),
        adminDb.collection('analytics_visit_dedup').where('createdAt', '<', new Date(Date.now() - INTELLIGENCE_RETENTION_DAYS.visitDeduplication * 86_400_000)).count().get(),
    ]);

    const paidOrderCount = paidOrders.data().count;
    const purchaseCount = purchases.data().count;
    let impressions = 0;
    let clicks = 0;
    let addToCarts = 0;
    let latestRecommendationEvent: number | null = null;
    let schemaMissing = 0;
    recommendationDocs.docs.forEach(doc => {
        const data = doc.data();
        impressions += Number(data.impressions || 0);
        clicks += Number(data.clicks || 0);
        addToCarts += Number(data.addToCarts || 0);
        if (!data.schemaVersion) schemaMissing += 1;
        const eventAt = timestampMs(data.lastEventAt);
        if (eventAt && (!latestRecommendationEvent || eventAt > latestRecommendationEvent)) latestRecommendationEvent = eventAt;
    });

    const productsMissingSupplyData = products.docs.filter(doc => {
        const data = doc.data();
        return !Number.isFinite(Number(data.leadTimeDays)) || !Number.isFinite(Number(data.safetyStock)) || !Number.isFinite(Number(data.minimumOrderQuantity));
    }).length;
    const lastAlertSyncAt = alerts.empty ? null : timestampMs(alerts.docs[0].data().updatedAt);
    const reconciliationGap = Math.abs(paidOrderCount - purchaseCount);

    const checks = [
        { id: 'purchase-reconciliation', label: 'Paid-order reconciliation', status: reconciliationGap === 0 ? 'healthy' : 'warning', detail: `${paidOrderCount} paid orders; ${purchaseCount} purchase analytics; gap ${reconciliationGap}.` },
        { id: 'recommendation-freshness', label: 'Recommendation event freshness', status: latestRecommendationEvent && Date.now() - latestRecommendationEvent < 7 * 86_400_000 ? 'healthy' : 'warning', detail: latestRecommendationEvent ? `Last event ${new Date(latestRecommendationEvent).toISOString()}.` : 'No recommendation event recorded yet.' },
        { id: 'schema-coverage', label: 'Analytics schema coverage', status: schemaMissing === 0 ? 'healthy' : 'warning', detail: `${schemaMissing} of ${recommendationDocs.size} sampled recommendation records use a legacy schema.` },
        { id: 'supply-data', label: 'Product supply-data coverage', status: productsMissingSupplyData === 0 ? 'healthy' : 'warning', detail: `${productsMissingSupplyData} of ${products.size} sampled products need lead time, safety stock, or MOQ data.` },
        { id: 'alert-sync', label: 'Operational alert freshness', status: lastAlertSyncAt && Date.now() - lastAlertSyncAt < 2 * 86_400_000 ? 'healthy' : 'warning', detail: lastAlertSyncAt ? `Last alert update ${new Date(lastAlertSyncAt).toISOString()}.` : 'No alert synchronization recorded.' },
        { id: 'retention', label: 'Retention cleanup backlog', status: dedupExpired.data().count === 0 ? 'healthy' : 'warning', detail: `${dedupExpired.data().count} expired visit-deduplication records await scheduled cleanup.` },
    ];

    return NextResponse.json({
        generatedAt: new Date().toISOString(),
        overall: checks.every(check => check.status === 'healthy') ? 'healthy' : 'attention',
        checks,
        outcomes: {
            impressions,
            clicks,
            addToCarts,
            clickThroughRate: impressions ? clicks / impressions : 0,
            addToCartRate: impressions ? addToCarts / impressions : 0,
        },
        experiment: PERSONALIZED_HOME_EXPERIMENT,
        retentionDays: INTELLIGENCE_RETENTION_DAYS,
        notes: ['Aggregated signals are directional, not proof of causation.', 'The experiment guardrails must be reviewed before increasing rollout.'],
    });
}
