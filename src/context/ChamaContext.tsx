"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, arrayUnion, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

export interface ChamaGroup {
    id: string;
    productId: string;
    productName: string;
    productImage: string;
    price: number;
    originalPrice: number;
    creatorId: string;
    creatorName: string;
    members: { userId: string; userName: string; status: 'paid' | 'pending' }[];
    targetSize: number;
    status: 'active' | 'completed' | 'expired';
    createdAt: any;
    expiresAt: any;
}

interface ChamaContextType {
    activeChamas: ChamaGroup[];
    createChama: (product: any) => Promise<string>;
    joinChama: (chamaId: string) => Promise<void>;
    loading: boolean;
}

const ChamaContext = createContext<ChamaContextType | undefined>(undefined);

export function ChamaProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [activeChamas, setActiveChamas] = useState<ChamaGroup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen to active chamas (global for now, or filtered by user interest)
        // For MVP, show all active chamas so people can see the feature
        const q = query(collection(db, 'chamas'), where('status', '==', 'active'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const groups = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ChamaGroup[];
            setActiveChamas(groups);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const createChama = async (product: any) => {
        if (!user) {
            toast.error("Please login to start a Chama");
            throw new Error("Login required");
        }

        const discountedPrice = Math.floor(product.price * 0.85); // 15% discount
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24h expiry

        const newChama: any = {
            productId: product.id,
            productName: product.name,
            productImage: product.image,
            price: discountedPrice,
            originalPrice: product.price,
            creatorId: user.uid,
            creatorName: user.name || 'Anonymous',
            members: [{ userId: user.uid, userName: user.name || 'Anonymous', status: 'pending' }], // pending until paid
            targetSize: 3,
            status: 'active',
            createdAt: serverTimestamp(),
            expiresAt: expiresAt
        };

        const docRef = await addDoc(collection(db, 'chamas'), newChama);
        toast.success("Chama started! Share the link with friends.");
        return docRef.id;
    };

    const joinChama = async (chamaId: string) => {
        if (!user) {
            toast.error("Please login to join a Chama");
            return;
        }

        const chamaRef = doc(db, 'chamas', chamaId);
        // Check if already member (client side check for speed, security rules for real check)
        // ...

        await updateDoc(chamaRef, {
            members: arrayUnion({ userId: user.uid, userName: user.name || 'User', status: 'pending' })
        });
        toast.success("Joined Chama! Complete checkout to lock price.");
    };

    return (
        <ChamaContext.Provider value={{ activeChamas, createChama, joinChama, loading }}>
            {children}
        </ChamaContext.Provider>
    );
}

export function useChama() {
    const context = useContext(ChamaContext);
    if (context === undefined) {
        throw new Error('useChama must be used within a ChamaProvider');
    }
    return context;
}
