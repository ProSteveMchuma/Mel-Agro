import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { buildCustomerProfiles, computeIntelKPIs, summariseSegments } from "@/lib/customer-intelligence";
import { actionableReorders, buildReorderPredictions } from "@/lib/reorder-intelligence";
import type { Order } from "@/types";

export async function GET(request: Request) {
    const auth = await requirePermission(request, "analytics.view");
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 403 });
    const snapshot = await adminDb.collection("orders").orderBy("date", "desc").limit(2000).get();
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Order[];
    const profiles = buildCustomerProfiles(orders);
    const reorderDueUserIds = [...new Set(actionableReorders(buildReorderPredictions(orders)).slice(0, 25).map((item) => item.userId))];
    return NextResponse.json({
        success: true,
        generatedAt: new Date().toISOString(),
        scannedOrders: orders.length,
        profiles,
        segments: summariseSegments(profiles),
        kpis: computeIntelKPIs(profiles),
        reorderDueUserIds,
    });
}
