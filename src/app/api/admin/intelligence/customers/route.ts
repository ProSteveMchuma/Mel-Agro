import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import { buildCustomerProfiles, computeIntelKPIs, summariseSegments } from "@/lib/customer-intelligence";
import { actionableReorders, buildReorderPredictions } from "@/lib/reorder-intelligence";
import { checkoutStepLabel, latestCheckoutStep, shopPathTrail } from "@/lib/shop-journey";
import type { Order } from "@/types";

async function customerVisits(userIds: string[]) {
    const ids = [...new Set(userIds.map((id) => id.trim()).filter((id) => id && id.length <= 128 && !id.includes("/") && !id.includes(":")))].slice(0, 200);
    if (!ids.length) return {};
    const [funnels, carts] = await Promise.all([
        adminDb.getAll(...ids.map((id) => adminDb.collection("analytics_funnels").doc(id))),
        adminDb.getAll(...ids.map((id) => adminDb.collection("carts").doc(id))),
    ]);
    const visits: Record<string, { lastStep: string | null; pathTrail: string[]; openCart: boolean }> = {};
    ids.forEach((id, index) => {
        const funnel = funnels[index]?.data() || {};
        const cart = carts[index]?.data();
        const items = Array.isArray(cart?.items) ? cart.items : [];
        const openCart = Boolean(cart) && cart?.status !== "converted" && items.length > 0;
        visits[id] = {
            lastStep: checkoutStepLabel(latestCheckoutStep(funnel)),
            pathTrail: shopPathTrail(funnel.pathTrail),
            openCart,
        };
    });
    return visits;
}

export async function GET(request: Request) {
    const auth = await requirePermission(request, "analytics.view");
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 403 });
    const snapshot = await adminDb.collection("orders").orderBy("date", "desc").limit(2000).get();
    const orders = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Order[];
    const profiles = buildCustomerProfiles(orders);
    const reorderDueUserIds = [...new Set(actionableReorders(buildReorderPredictions(orders)).slice(0, 25).map((item) => item.userId))];
    const visits = await customerVisits(profiles.map((profile) => profile.userId)).catch(() => ({}));
    return NextResponse.json({
        success: true,
        generatedAt: new Date().toISOString(),
        scannedOrders: orders.length,
        profiles,
        segments: summariseSegments(profiles),
        kpis: computeIntelKPIs(profiles),
        reorderDueUserIds,
        visits,
    });
}
