import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { dateRangeCutoff, type DateRange } from "@/lib/analytics-aggregations";
import { nairobiClock, sumVisitClock, type VisitClockDoc } from "@/lib/nairobi-clock";
import { summariseFunnels, type FunnelDoc } from "@/lib/storefront-analytics";
import { rollupVisitBreakdown } from "@/lib/commerce-ops";

const ranges = new Set<DateRange>(["7d", "30d", "90d", "12m", "all"]);

async function namedProductCounts(rows: Array<{ productId: string; views: number; addToCartCount: number; purchases: number }>) {
  const ids = rows.map((row) => row.productId).filter((id) => id && id.length <= 128 && !id.includes("/"));
  const snaps = ids.length
    ? await adminDb.getAll(...ids.map((id) => adminDb.collection("products").doc(id))).catch(() => [])
    : [];
  const catalogue = new Map(snaps.filter((snap) => snap.exists).map((snap) => [snap.id, snap.data() || {}]));
  return rows.map((row) => {
    const data = catalogue.get(row.productId);
    const qty = data ? Number(data.stockQuantity ?? data.stock ?? 0) : null;
    const stockQuantity = qty != null && Number.isFinite(qty) ? qty : null;
    const inStock = data ? data.inStock !== false && (stockQuantity ?? 0) > 0 : null;
    return { ...row, name: String(data?.name || "").trim() || row.productId, stockQuantity, inStock };
  });
}
export async function GET(request: Request) {
  const actor = await requirePermission(request, "analytics.view");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  try {
    const requested = new URL(request.url).searchParams.get("range") as DateRange;
    const range = ranges.has(requested) ? requested : "30d";
    const cutoff = dateRangeCutoff(range);
    let query = adminDb.collection("orders").orderBy("date", "desc").limit(2501);
    if (cutoff) query = query.where("date", ">=", cutoff.toISOString());
    const trafficLimit = range === "7d" ? 7 : range === "30d" ? 31 : range === "90d" ? 90 : 120;
    const snapshot = await query.get();
    const emptyVisitClock = sumVisitClock([]);
    const emptyStorefront = { traffic: [], searches: [], products: [], funnel: summariseFunnels([]), pages: [], regions: [], visitHours: emptyVisitClock.hours, visitWeekdays: emptyVisitClock.weekdays };
    const pageQuery = cutoff
      ? adminDb.collection("analytics_pages").where("date", ">=", cutoff.toISOString().slice(0, 10)).limit(500)
      : adminDb.collection("analytics_pages").orderBy("date", "desc").limit(500);
    const regionQuery = cutoff
      ? adminDb.collection("analytics_regions").where("date", ">=", cutoff.toISOString().slice(0, 10)).limit(500)
      : adminDb.collection("analytics_regions").orderBy("date", "desc").limit(500);
    const visitClockFrom = cutoff ? nairobiClock(cutoff)?.date ?? null : null;
    const visitClockQuery = visitClockFrom
      ? adminDb.collection("analytics_visit_clock").where("date", ">=", visitClockFrom).orderBy("date").limit(400)
      : adminDb.collection("analytics_visit_clock").orderBy("date");
    const storefrontReads = await Promise.allSettled([
      adminDb.collection("analytics_traffic").orderBy("date", "desc").limit(trafficLimit).get(),
      adminDb.collection("analytics_search_terms").orderBy("count", "desc").limit(8).get(),
      adminDb.collection("analytics_products").orderBy("views", "desc").limit(8).get(),
      adminDb.collection("analytics_funnels").limit(1500).get(),
      pageQuery.get(),
      regionQuery.get(),
      visitClockQuery.get(),
    ]);
    const [trafficSnap, searchSnap, productSnap, funnelSnap, pageSnap, regionSnap, visitClockSnap] = storefrontReads.map((result) => result.status === "fulfilled" ? result.value : null);
    const visitClock = sumVisitClock(visitClockSnap ? visitClockSnap.docs.map((document) => {
      const data = document.data();
      const hours = data.hours && typeof data.hours === "object" ? data.hours as VisitClockDoc["hours"] : {};
      return { date: String(data.date || document.id), weekday: String(data.weekday || ""), hours };
    }) : [], visitClockFrom);
    const storefront = {
      traffic: trafficSnap ? trafficSnap.docs.map((document) => ({
        date: String(document.data().date || document.id),
        totalVisits: Number(document.data().totalVisits || 0),
        uniqueVisitors: Number(document.data().uniqueVisitors || 0),
      })) : emptyStorefront.traffic,
      searches: searchSnap ? searchSnap.docs.map((document) => ({
        term: String(document.data().term || ""),
        count: Number(document.data().count || 0),
      })).filter((item) => item.term) : emptyStorefront.searches,
      products: productSnap ? await namedProductCounts(productSnap.docs.map((document) => {
        const data = document.data();
        return {
          productId: String(data.productId || document.id),
          views: Number(data.views || 0),
          addToCartCount: Number(data.addToCartCount || 0),
          purchases: Number(data.purchases || 0),
        };
      })) : emptyStorefront.products,
      funnel: funnelSnap ? summariseFunnels(funnelSnap.docs.map((document) => document.data() as FunnelDoc)) : emptyStorefront.funnel,
      pages: rollupVisitBreakdown(pageSnap ? pageSnap.docs.map((document) => ({
        key: String(document.data().path || ""),
        views: Number(document.data().views || 0),
        uniques: Number(document.data().uniques || 0),
      })) : []),
      regions: rollupVisitBreakdown(regionSnap ? regionSnap.docs.map((document) => ({
        key: String(document.data().region || ""),
        views: Number(document.data().views || 0),
        uniques: Number(document.data().uniques || 0),
      })) : []),
      visitHours: visitClock.hours,
      visitWeekdays: visitClock.weekdays,
    };
    return NextResponse.json({
      success: true,
      orders: snapshot.docs.slice(0, 2500).map((document) => ({ id: document.id, ...document.data() })),
      truncated: snapshot.size > 2500,
      generatedAt: new Date().toISOString(),
      storefront,
      definitions: {
        revenue: "Gross paid order total",
        refunds: "Tracked separately and not silently netted from revenue",
        traffic: "UTC calendar-day visits from analytics_traffic",
        visitHours: "Africa/Nairobi hour and weekday counted when a visit is recorded. Older daily totals are not split into hours.",
        pages: "Page views recorded with each visit, staff console excluded",
        regions: "Visit region from hosting geo headers, not a customer address",
        searches: "Lifetime search counts from /api/analytics",
        funnel: "Signed-in checkout sessions in analytics_funnels",
      },
    });
  } catch (error) {
    console.error("Admin analytics data failed:", error);
    return NextResponse.json({ success: false, message: "Could not load analytics data." }, { status: 500 });
  }
}
