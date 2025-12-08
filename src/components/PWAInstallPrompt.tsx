"use client";
import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallBanner, setShowInstallBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already in standalone mode
        // @ts-ignore
        if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
            setIsStandalone(true);
            return;
        }

        // Check for iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Handle Android/Desktop "beforeinstallprompt"
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Only show if not already dismissed recently (logic could be added here)
            setShowInstallBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Show iOS banner after a delay if not standalone
        if (isIosDevice && !isStandalone) {
            const timer = setTimeout(() => setShowInstallBanner(true), 3000);
            return () => clearTimeout(timer);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [isStandalone]);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setShowInstallBanner(false);
        }
    };

    if (!showInstallBanner || isStandalone) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg md:hidden animate-in slide-in-from-bottom duration-500">
            <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                    <div className="w-12 h-12 bg-melagro-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0">
                        M
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Install MelAgro App</h3>
                        <p className="text-sm text-gray-500">
                            {isIOS
                                ? "Tap 'Share' then 'Add to Home Screen' for the best experience."
                                : "Get the app for faster access and offline mode."}
                        </p>
                    </div>
                </div>
                <button onClick={() => setShowInstallBanner(false)} className="text-gray-400 hover:text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>

            {!isIOS && (
                <button
                    onClick={handleInstallClick}
                    className="mt-4 w-full bg-melagro-primary text-white py-3 rounded-xl font-bold font-medium"
                >
                    Install Now
                </button>
            )}

            {isIOS && (
                <div className="mt-4 flex flex-col items-center gap-2 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                        1. Tap <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg> Share
                    </div>
                    <div className="flex items-center gap-2">
                        2. Select <span className="font-bold text-gray-900 border border-gray-200 px-1 rounded bg-gray-50">+ Add to Home Screen</span>
                    </div>
                </div>
            )}
        </div>
    );
}
