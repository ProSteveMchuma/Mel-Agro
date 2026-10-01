import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";
import {
    computeAlertKPIs,
    demandSpikes,
    paymentFailureClusters,
    refundWatch,
    slaBreaches,
    stockOutForecast,
} from "@/lib/operational-alerts";
import type { Order, Product } from "@/types";

function finite(value: number) {
    return Number.isFinite(value) ? value : null;
}

export async function GET(request: Request) {
    const auth = await requirePermission(request, "orders.manage");
    if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: 403 });
    const [ordersSnap, productsSnap] = await Promise.all([
        adminDb.collection("orders").orderBy("date", "desc").limit(2000).get(),
        adminDb.collection("products").limit(1000).get(),
    ]);
    const orders = ordersSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Order[];
    const products = productsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            name: String(data.name || "Product"),
            stockQuantity: Number(data.stockQuantity || 0),
            lowStockThreshold: Number(data.lowStockThreshold || 0),
        };
    }) as Product[];
    const stock = stockOutForecast(orders, products, 30).map((item) => ({ ...item, daysOfCover: finite(item.daysOfCover) }));
    const spikes = demandSpikes(orders, products).map((item) => ({
        ...item,
        multiplier: finite(item.multiplier),
        daysOfCoverAtRecentVelocity: finite(item.daysOfCoverAtRecentVelocity),
    }));
    const failures = paymentFailureClusters(orders);
    const refund = refundWatch(orders);
    const sla = slaBreaches(orders, 48);
    return NextResponse.json({
        success: true,
        generatedAt: new Date().toISOString(),
        scannedOrders: orders.length,
        stock,
        spikes,
        failures,
        refund,
        sla,
        kpis: computeAlertKPIs(
            stock.map((item) => ({ ...item, daysOfCover: item.daysOfCover ?? Infinity })),
            spikes.map((item) => ({ ...item, multiplier: item.multiplier ?? Infinity, daysOfCoverAtRecentVelocity: item.daysOfCoverAtRecentVelocity ?? Infinity })),
            failures,
            refund,
            sla,
        ),
    });
}
