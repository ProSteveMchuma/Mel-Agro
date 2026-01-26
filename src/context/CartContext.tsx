"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, ProductVariant } from '@/types';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
    isCartOpen: boolean;
    toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // 1. Initial Load: LocalStorage -> Firestore Merge
    useEffect(() => {
        const loadCart = async () => {
            const localCart = localStorage.getItem('Mel-Agri_cart');
            let items: CartItem[] = [];

            if (localCart) {
                try {
                    items = JSON.parse(localCart);
                } catch (e) {
                    console.error("Failed to parse local cart", e);
                }
            }

            if (user) {
                try {
                    const cartDoc = await getDoc(doc(db, 'carts', user.uid));
                    if (cartDoc.exists()) {
                        const cloudItems = cartDoc.data().items as CartItem[];
                        // Simple merge strategy: Cloud items take priority if they exist
                        // Or you could combine them. Let's combine unique ones.
                        const combinedMap = new Map();
                        items.forEach(item => combinedMap.set(item.id, item));
                        cloudItems.forEach(item => combinedMap.set(item.id, item));
                        items = Array.from(combinedMap.values());
                    }
                } catch (e) {
                    console.error("Failed to sync cloud cart", e);
                }
            }

            setCartItems(items);
            setIsInitialLoad(false);
        };

        loadCart();
    }, [user]);

    // 2. Persist to LocalStorage and Cloud
    useEffect(() => {
        if (isInitialLoad) return;

        localStorage.setItem('Mel-Agri_cart', JSON.stringify(cartItems));

        if (user) {
            const syncCart = async () => {
                try {
                    await setDoc(doc(db, 'carts', user.uid), {
                        userId: user.uid,
                        userName: user.name || 'Anonymous Farmer',
                        userEmail: user.email,
                        userPhone: user.phone || '',
                        items: cartItems,
                        total: cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                        itemCount: cartItems.reduce((acc, item) => acc + item.quantity, 0),
                        updatedAt: new Date().toISOString(),
                        status: cartItems.length > 0 ? 'active' : 'cleared'
                    }, { merge: true });
                } catch (e) {
                    console.error("Cloud cart sync failed", e);
                }
            };
            syncCart();
        }
    }, [cartItems, user, isInitialLoad]);

    const addToCart = (product: Product, quantity = 1, variant?: ProductVariant) => {
        // Log analytics
        import('@/lib/analytics').then(({ AnalyticsService }) => {
            AnalyticsService.logAddToCart(String(product.id));
        });

        const cartItemId = variant ? `${product.id}-${variant.id}` : String(product.id);
        const itemPrice = variant?.price || product.price;
        const itemName = variant ? `${product.name} (${variant.name})` : product.name;

        setCartItems(prev => {
            const existing = prev.find(item => item.cartItemId === cartItemId);

            if (existing) {
                toast.success(`Updated quantity for ${itemName}`);
                return prev.map(item =>
                    item.cartItemId === cartItemId
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }

            toast.success(`Added ${itemName} to cart`);
            return [...prev, { ...product, cartItemId, quantity, selectedVariant: variant, price: itemPrice }];
        });
        setIsCartOpen(true); // Open drawer on add
    };

    const removeFromCart = (cartItemId: string) => {
        setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
        toast.success('Removed from cart');
    };

    const updateQuantity = (cartItemId: string, quantity: number) => {
        if (quantity < 1) return;
        setCartItems(prev => prev.map(item =>
            item.cartItemId === cartItemId ? { ...item, quantity } : item
        ));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const toggleCart = () => {
        setIsCartOpen(prev => !prev);
    };

    const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartTotal,
            cartCount,
            isCartOpen,
            toggleCart
        }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
