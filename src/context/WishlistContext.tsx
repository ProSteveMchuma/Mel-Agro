"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/context/ProductContext';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

interface WishlistContextType {
    wishlist: Product[];
    addToWishlist: (product: Product) => void;
    removeFromWishlist: (productId: string | number) => void;
    isInWishlist: (productId: string | number) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [wishlist, setWishlist] = useState<Product[]>([]);

    // Load from Firestore if user is logged in, otherwise localStorage
    useEffect(() => {
        if (user) {
            const docRef = doc(db, 'wishlist', user.uid);
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    setWishlist(docSnap.data().products || []);
                }
            });
            return () => unsubscribe();
        } else {
            const saved = localStorage.getItem('Mel-Agri_wishlist');
            if (saved) {
                setWishlist(JSON.parse(saved));
            }
        }
    }, [user]);

    // Sync to localStorage as backup/cache
    useEffect(() => {
        localStorage.setItem('Mel-Agri_wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

    const addToWishlist = async (product: Product) => {
        if (!isInWishlist(product.id)) {
            const updatedWishlist = [...wishlist, product];
            setWishlist(updatedWishlist); // Optimistic update
            toast.success('Added to wishlist');

            if (user) {
                try {
                    await setDoc(doc(db, 'wishlist', user.uid), { products: updatedWishlist });
                } catch (error) {
                    console.error("Error saving wishlist:", error);
                }
            }
        }
    };

    const removeFromWishlist = async (productId: string | number) => {
        const updatedWishlist = wishlist.filter(p => p.id !== productId);
        setWishlist(updatedWishlist); // Optimistic update
        toast.success('Removed from wishlist');

        if (user) {
            try {
                await setDoc(doc(db, 'wishlist', user.uid), { products: updatedWishlist });
            } catch (error) {
                console.error("Error updating wishlist:", error);
            }
        }
    };

    const isInWishlist = (productId: string | number) => {
        return wishlist.some(p => p.id === productId);
    };

    return (
        <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist }}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
