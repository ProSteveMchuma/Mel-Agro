"use client";

import { useEffect } from 'react';

export default function ServiceWorkerCleanup() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        void navigator.serviceWorker.getRegistrations().then((registrations) =>
            Promise.all(registrations.map((registration) => registration.unregister())),
        );
    }, []);

    return null;
}
