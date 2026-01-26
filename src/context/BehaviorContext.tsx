"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

    const { user } = useAuth();

    // Initial Load from Persistent Storage
    useEffect(() => {
        const savedAffinity = localStorage.getItem('Mel-Agri_behavior_affinity');
        if (savedAffinity) {
            try {
                setAffinityIndex(JSON.parse(savedAffinity));
            } catch (e) {
                console.error("Failed to parse behavioral data", e);
            }
        }
    }, []);

    // Save to Persistent Storage & Firestore on change
    useEffect(() => {
        if (Object.keys(affinityIndex).length > 0) {
            localStorage.setItem('Mel-Agri_behavior_affinity', JSON.stringify(affinityIndex));

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

    const showProactiveHelp = (message: string, action?: { label: string, onClick: () => void }) => {
        toast((t) => (
            <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                    <span className="text-xl">👋</span>
                    <p className="text-sm font-bold text-gray-100">{message}</p>
                </div>
                {action && (
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => {
                                action.onClick();
                                toast.dismiss(t.id);
                            }}
                            className="px-3 py-1.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-green-700 transition-colors shadow-lg shadow-green-900/40"
                        >
                            {action.label}
                        </button>
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="px-3 py-1.5 bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white/20 transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                )}
            </div>
        ), {
            duration: action ? 10000 : 6000,
            style: {
                borderRadius: '1.25rem',
                background: '#111827',
                color: '#fff',
                padding: '1rem',
                border: '1px solid #374151',
                maxWidth: '400px'
            },
        });
    };

    const updateAffinity = (category: string, score: number) => {
        setAffinityIndex(prev => ({
            ...prev,
            [category]: (prev[category] || 0) + score
        }));
    };

    const resetInactivityTimer = (delay: number = 60000) => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(() => {
            handleInactivity();
        }, delay);
    };

    const handleInactivity = () => {
        if (pathname === '/checkout' && !hasShownCheckoutHelp) {
            showProactiveHelp(
                "Need help completing your order? Our support team is one click away via WhatsApp.",
                {
                    label: "Get Help",
                    onClick: () => window.open('https://wa.me/254748970757?text=Hello,%20I%20am%20having%20some%20trouble%20completing%20my%20order.', '_blank')
                }
            );
            setHasShownCheckoutHelp(true);
        }
    };

    const trackAction = (action: string, metadata?: any) => {
        setLastAction(action);

        if (action === 'product_view' && metadata?.category) {
            updateAffinity(metadata.category, 5);
        }
        if (action === 'category_view' && metadata?.category) {
            updateAffinity(metadata.category, 2);
        }
        if (action === 'cart_add' && metadata?.category) {
            updateAffinity(metadata.category, 10);
        }

        if (action === 'empty_search') {
            setSearchFailures(prev => prev + 1);
            if (searchFailures >= 1) {
                showProactiveHelp(
                    "Can't find what you're looking for? Our team can help you source it via WhatsApp!",
                    {
                        label: "WhatsApp Support",
                        onClick: () => window.open('https://wa.me/254748970757?text=Hello,%20I%20am%20looking%20for%20something%20I%20can%20not%20find%20on%20the%20website.', '_blank')
                    }
                );
            }
        }

        if (action === 'checkout_validation_frustration') {
            showProactiveHelp(
                "Having trouble with the form? Feel free to contact us or use 'WhatsApp Order' to checkout faster!",
                {
                    label: "Order via WhatsApp",
                    onClick: () => window.open('https://wa.me/254748970757?text=Hello,%20I%20need%20help%20completing%20my%20order.', '_blank')
                }
            );
        }

        if (action === 'checkout_start') {
            resetInactivityTimer(120000);
            logFunnelEvent('start');
        }

        if (action === 'checkout_step' && metadata?.step) {
            logFunnelEvent(metadata.step);
        }

        if (action === 'checkout_complete') {
            logFunnelEvent('complete');
        }
    };

    const logFunnelEvent = async (step: string) => {
        if (!user?.uid) return;
        try {
            const funnelRef = doc(db, 'analytics_funnels', user.uid);
            await setDoc(funnelRef, {
                userId: user.uid,
                lastStep: step,
                timestamp: serverTimestamp(),
                steps: {
                    [step]: serverTimestamp()
                }
            }, { merge: true });
        } catch (e) {
            console.error("Failed to log funnel event", e);
        }
    };

    const getTopAffinity = () => {
        if (Object.keys(affinityIndex).length === 0) return 'General';
        let top = 'General';
        let max = -1;
        Object.entries(affinityIndex).forEach(([cat, score]) => {
            if (score > max) {
                max = score;
                top = cat;
            }
        });
        return top;
    };

    useEffect(() => {
        trackAction('page_view', { path: pathname });
        if (pathname === '/checkout') {
            resetInactivityTimer(120000);
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
