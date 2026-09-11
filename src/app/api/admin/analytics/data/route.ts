import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { dateRangeCutoff, type DateRange } from "@/lib/analytics-aggregations";
import { summariseFunnels, type FunnelDoc } from "@/lib/storefront-analytics";

const ranges = new Set<DateRange>(["7d", "30d", "90d", "12m", "all"]);
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
    const emptyStorefront = { traffic: [], searches: [], products: [], funnel: summariseFunnels([]) };
    const storefrontReads = await Promise.allSettled([
      adminDb.collection("analytics_traffic").orderBy("date", "desc").limit(trafficLimit).get(),
      adminDb.collection("analytics_search_terms").orderBy("count", "desc").limit(8).get(),
      adminDb.collection("analytics_products").orderBy("views", "desc").limit(8).get(),
      adminDb.collection("analytics_funnels").limit(1500).get(),
    ]);
    const [trafficSnap, searchSnap, productSnap, funnelSnap] = storefrontReads.map((result) => result.status === "fulfilled" ? result.value : null);
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
      products: productSnap ? productSnap.docs.map((document) => {
        const data = document.data();
        return {
          productId: String(data.productId || document.id),
          views: Number(data.views || 0),
          addToCartCount: Number(data.addToCartCount || 0),
          purchases: Number(data.purchases || 0),
        };
      }) : emptyStorefront.products,
      funnel: funnelSnap ? summariseFunnels(funnelSnap.docs.map((document) => document.data() as FunnelDoc)) : emptyStorefront.funnel,
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
        searches: "Lifetime search counts from /api/analytics",
        funnel: "Signed-in checkout sessions in analytics_funnels",
      },
    });
  } catch (error) {
    console.error("Admin analytics data failed:", error);
    return NextResponse.json({ success: false, message: "Could not load analytics data." }, { status: 500 });
  }
}
