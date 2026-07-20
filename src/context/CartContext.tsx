"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, ProductVariant } from '@/types';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => boolean;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;
    isCartOpen: boolean;
    toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function getAvailableStock(product: Product, variant?: ProductVariant): number {
    const rawStock = variant?.stockQuantity ?? product.stockQuantity ?? product.stock ?? 0;
    const stock = Number(rawStock);
    return Number.isFinite(stock) ? Math.max(0, stock) : 0;
}

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
                        const cloudItems = (cartDoc.data().items || []) as CartItem[];
                        // If local/guest cart has items, we do NOT merge with cloud items to prevent duplicate quantities.
                        // We only load cloud items if the local cart is empty.
                        if (items.length === 0) {
                            items = cloudItems;
                        }
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
                        userEmail: user.email || '',
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
        const availableStock = getAvailableStock(product, variant);
        if (product.inStock === false || availableStock < 1) {
            toast.error(`${product.name} is currently out of stock`);
            return false;
        }

        const requestedQuantity = Math.max(1, Math.floor(quantity));
        // Log analytics
        import('@/lib/analytics').then(({ AnalyticsService }) => {
            AnalyticsService.logAddToCart(String(product.id));
        });

        const cartItemId = variant ? `${product.id}-${variant.id}` : String(product.id);
        const itemPrice = variant?.price || product.price;
        const itemName = variant ? `${product.name} (${variant.name})` : product.name;
        const existing = cartItems.find(item => item.cartItemId === cartItemId);
        const nextQuantity = (existing?.quantity || 0) + requestedQuantity;

        if (nextQuantity > availableStock) {
            toast.error(`Only ${availableStock} ${itemName} available`);
            return false;
        }

        if (existing) {
            setCartItems(prev => prev.map(item =>
                    item.cartItemId === cartItemId
                        ? { ...item, quantity: nextQuantity }
                        : item
                ));
            toast.success(`Updated quantity for ${itemName}`);
        } else {
            setCartItems(prev => [
                ...prev,
                { ...product, cartItemId, quantity: requestedQuantity, selectedVariant: variant, price: itemPrice },
            ]);
            toast.success(`Added ${itemName} to cart`);
        }
        setIsCartOpen(true); // Open drawer on add
        return true;
    };

    const removeFromCart = (cartItemId: string) => {
        setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
        toast.success('Removed from cart');
    };

    const updateQuantity = (cartItemId: string, quantity: number) => {
        if (quantity < 1) return;
        setCartItems(prev => prev.map(item => {
            if (item.cartItemId !== cartItemId) return item;
            const availableStock = getAvailableStock(item, item.selectedVariant);
            if (quantity > availableStock) {
                toast.error(`Only ${availableStock} ${item.name} available`);
                return item;
            }
            return { ...item, quantity };
        }));
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
