import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requirePermission } from "@/lib/auth-server";
import { dateRangeCutoff, type DateRange } from "@/lib/analytics-aggregations";

const ranges = new Set<DateRange>(["7d", "30d", "90d", "12m", "all"]);
export async function GET(request: Request) {
  const actor = await requirePermission(request, "analytics.view");
  if (!actor.ok) return NextResponse.json({ success: false, message: actor.message }, { status: 403 });
  const requested = new URL(request.url).searchParams.get("range") as DateRange;
  const range = ranges.has(requested) ? requested : "30d";
  const cutoff = dateRangeCutoff(range);
  let query = adminDb.collection("orders").orderBy("date", "desc").limit(2501);
  if (cutoff) query = query.where("date", ">=", cutoff.toISOString());
  const snapshot = await query.get();
  return NextResponse.json({ success: true, orders: snapshot.docs.slice(0, 2500).map((document) => ({ id: document.id, ...document.data() })), truncated: snapshot.size > 2500, generatedAt: new Date().toISOString(), definitions: { revenue: "Gross paid order total", refunds: "Tracked separately and not silently netted from revenue" } });
}
