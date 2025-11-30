"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/lib/mockData';

interface WishlistContextType {
    wishlist: Product[];
    addToWishlist: (product: Product) => void;
    removeFromWishlist: (productId: string | number) => void;
    isInWishlist: (productId: string | number) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const [wishlist, setWishlist] = useState<Product[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('melagro_wishlist');
        if (saved) {
            setWishlist(JSON.parse(saved));
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('melagro_wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

    const addToWishlist = (product: Product) => {
        if (!isInWishlist(product.id)) {
            setWishlist(prev => [...prev, product]);
        }
    };

    const removeFromWishlist = (productId: string | number) => {
        setWishlist(prev => prev.filter(p => p.id !== productId));
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
