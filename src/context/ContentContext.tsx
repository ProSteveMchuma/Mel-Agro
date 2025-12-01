"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface Banner {
    id: string;
    title: string;
    subtitle: string;
    description?: string;
    image: string;
    link: string;
    active: boolean;
}

interface ContentContextType {
    banners: Banner[];
    updateBanners: (banners: Banner[]) => Promise<void>;
    loading: boolean;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: React.ReactNode }) {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const docRef = doc(db, "content", "homepage");
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setBanners(docSnap.data().banners || []);
            } else {
                // Initialize with default/empty if not exists
                setBanners([]);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching content:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateBanners = async (newBanners: Banner[]) => {
        const docRef = doc(db, "content", "homepage");
        await setDoc(docRef, { banners: newBanners }, { merge: true });
    };

    return (
        <ContentContext.Provider value={{ banners, updateBanners, loading }}>
            {children}
        </ContentContext.Provider>
    );
}

export function useContent() {
    const context = useContext(ContentContext);
    if (context === undefined) {
        throw new Error('useContent must be used within a ContentProvider');
    }
    return context;
}
