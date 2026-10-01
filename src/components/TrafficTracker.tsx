"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AnalyticsService } from "@/lib/analytics";

export default function TrafficTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname || pathname.startsWith("/dashboard")) return;
        const track = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const lastVisit = localStorage.getItem('Mel-Agri_last_visit');
                const isUnique = lastVisit !== today;
                await AnalyticsService.trackVisit(isUnique, pathname);
                localStorage.setItem('Mel-Agri_last_visit', today);
            } catch (err) {
                console.error("Traffic Tracking Failed:", err);
            }
        };
        track();
    }, [pathname]);

    return null; // This component has no UI
}
