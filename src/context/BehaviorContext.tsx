"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

interface BehaviorContextType {
    trackAction: (action: string, metadata?: any) => void;
    lastAction: string | null;
}

const BehaviorContext = createContext<BehaviorContextType | undefined>(undefined);

export const BehaviorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const pathname = usePathname();
    const [lastAction, setLastAction] = useState<string | null>(null);
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
    const sessionStartTime = useRef(Date.now());

    // Internal state to track patterns
    const [searchFailures, setSearchFailures] = useState(0);
    const [hasShownCheckoutHelp, setHasShownCheckoutHelp] = useState(false);

    const trackAction = (action: string, metadata?: any) => {
        setLastAction(action);
        // console.log(`[Behavior] ${action}`, metadata);

        // Logic for specific "Assist" triggers
        if (action === 'empty_search') {
            setSearchFailures(prev => prev + 1);
            if (searchFailures >= 1) {
                showProactiveHelp("Can't find what you're looking for? Our team can help you source it via WhatsApp!");
            }
        }

        if (action === 'checkout_validation_frustration') {
            showProactiveHelp("Having trouble with the form? Feel free to contact us or use 'WhatsApp Order' to checkout faster!");
        }

        if (action === 'checkout_start') {
            resetInactivityTimer(120000); // 2 minutes for checkout assistance
        }
    };

    const showProactiveHelp = (message: string) => {
        toast(message, {
            duration: 6000,
            icon: '👋',
            style: {
                borderRadius: '1rem',
                background: '#111827',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '14px',
                border: '1px solid #374151'
            },
        });
    };

    const resetInactivityTimer = (delay: number = 60000) => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(() => {
            handleInactivity();
        }, delay);
    };

    const handleInactivity = () => {
        if (pathname === '/checkout' && !hasShownCheckoutHelp) {
            showProactiveHelp("Need help completing your order? Our support team is one click away.");
            setHasShownCheckoutHelp(true);
        }
    };

    // Track page changes
    useEffect(() => {
        trackAction('page_view', { path: pathname });

        // Specific page triggers
        if (pathname === '/checkout') {
            resetInactivityTimer(120000); // Trigger help after 2 mins on checkout
        } else {
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        }
    }, [pathname]);

    return (
        <BehaviorContext.Provider value={{ trackAction, lastAction }}>
            {children}
        </BehaviorContext.Provider>
    );
};

export const useBehavior = () => {
    const context = useContext(BehaviorContext);
    if (!context) throw new Error('useBehavior must be used within a BehaviorProvider');
    return context;
};
