"use client";
import { useState } from 'react';

export default function AnnouncementBar() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="bg-makamithi-dark text-white text-sm py-2 px-4 relative z-50">
            <div className="container-custom flex justify-between items-center">
                <p className="w-full text-center font-medium">
                    🌱 Free Shipping on orders over KES 5,000 | Use code <span className="font-bold text-makamithi-light">GROW2025</span>
                </p>
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    aria-label="Close announcement"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
