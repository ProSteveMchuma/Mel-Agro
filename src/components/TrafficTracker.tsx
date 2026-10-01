"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnalyticsService } from "@/lib/analytics";
import { entryPathForDay, salePathForDay, SHOP_ENTRY_STORAGE_KEY, SHOP_SALE_STORAGE_KEY, SHOP_VISIT_DAY_KEY } from "@/lib/shop-journey";

export default function TrafficTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname || pathname.startsWith("/dashboard")) return;
        const track = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const lastVisit = localStorage.getItem(SHOP_VISIT_DAY_KEY);
                const isUnique = lastVisit !== today;
                const entryPath = entryPathForDay({
                    today,
                    storedDay: lastVisit,
                    storedPath: localStorage.getItem(SHOP_ENTRY_STORAGE_KEY),
                    path: pathname,
                });
                const salePath = salePathForDay({
                    today,
                    storedDay: lastVisit,
                    storedPath: localStorage.getItem(SHOP_SALE_STORAGE_KEY),
                    path: pathname,
                });
                await AnalyticsService.trackVisit(isUnique, pathname);
                localStorage.setItem(SHOP_ENTRY_STORAGE_KEY, entryPath);
                if (salePath) localStorage.setItem(SHOP_SALE_STORAGE_KEY, salePath);
                else if (lastVisit !== today) localStorage.removeItem(SHOP_SALE_STORAGE_KEY);
                localStorage.setItem(SHOP_VISIT_DAY_KEY, today);
            } catch (err) {
                console.error("Traffic Tracking Failed:", err);
            }
        };
        track();
    }, [pathname]);

    return null; // This component has no UI
}
