"use client";

import { useEffect } from "react";
import { AnalyticsService } from "@/lib/analytics";

export default function TrafficTracker() {
    useEffect(() => {
        const track = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];
                const lastVisit = localStorage.getItem('Mel-Agri_last_visit');

                // If they haven't visited today, they are unique for today
                const isUnique = lastVisit !== today;

                await AnalyticsService.trackVisit(isUnique);

                // Update their last visit date
                localStorage.setItem('Mel-Agri_last_visit', today);
            } catch (err) {
                // Silently fail as analytics shouldn't break the UI
                console.debug("Traffic Tracking suppressed.");
            }
        };

        // Run tracking on mount
        track();
    }, []);

    return null; // This component has no UI
}
