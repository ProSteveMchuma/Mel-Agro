"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface BehaviorContextType {
    trackAction: (action: string, metadata?: any) => void;
    lastAction: string | null;
    affinityIndex: Record<string, number>;
    getTopAffinity: () => string;
}

const BehaviorContext = createContext<BehaviorContextType | undefined>(undefined);

export const BehaviorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const pathname = usePathname();
    const [lastAction, setLastAction] = useState<string | null>(null);
    const [affinityIndex, setAffinityIndex] = useState<Record<string, number>>({});
    const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
    const sessionStartTime = useRef(Date.now());

    // Internal state to track patterns
    const [searchFailures, setSearchFailures] = useState(0);
    const [hasShownCheckoutHelp, setHasShownCheckoutHelp] = useState(false);

    // Initial Load from Persistent Storage
    useEffect(() => {
        const savedAffinity = localStorage.getItem('melagro_behavior_affinity');
        if (savedAffinity) {
            try {
                setAffinityIndex(JSON.parse(savedAffinity));
            } catch (e) {
                console.error("Failed to parse behavioral data", e);
            }
        }
    }, []);

    const { user } = useAuth();

    // Save to Persistent Storage & Firestore on change
    useEffect(() => {
        if (Object.keys(affinityIndex).length > 0) {
            localStorage.setItem('melagro_behavior_affinity', JSON.stringify(affinityIndex));

            // Sync to Firestore if user is logged in
            if (user?.uid) {
                const syncData = async () => {
                    try {
                        const userRef = doc(db, 'users', user.uid);
                        await setDoc(userRef, {
                            affinityIndex,
                            lastBehavioralSync: new Date().toISOString()
                        }, { merge: true });
                    } catch (e) {
                        console.error("Failed to sync behavioral data to Firestore", e);
                    }
                };
                syncData();
            }
        }
    }, [affinityIndex, user?.uid]);

    const trackAction = (action: string, metadata?: any) => {
        setLastAction(action);

        // --- Affinity Engine Logic ---
        if (action === 'product_view' && metadata?.category) {
            updateAffinity(metadata.category, 5); // Viewing a product is high intent
        }
        if (action === 'category_view' && metadata?.category) {
            updateAffinity(metadata.category, 2); // Browsing a category is moderate intent
        }
        if (action === 'cart_add' && metadata?.category) {
            updateAffinity(metadata.category, 10); // Adding to cart is very high intent
        }

        // --- Intent & Assistance Triggers ---
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

    const updateAffinity = (category: string, score: number) => {
        setAffinityIndex(prev => ({
            ...prev,
            [category]: (prev[category] || 0) + score
        }));
    };

    const getTopAffinity = () => {
        if (Object.keys(affinityIndex).length === 0) return 'General';
        return Object.entries(affinityIndex).reduce((a, b) => a[1] > b[1] ? a : b)[0];
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
        <BehaviorContext.Provider value={{ trackAction, lastAction, affinityIndex, getTopAffinity }}>
            {children}
        </BehaviorContext.Provider>
    );
};

export const useBehavior = () => {
    const context = useContext(BehaviorContext);
    if (!context) throw new Error('useBehavior must be used within a BehaviorProvider');
    return context;
};
