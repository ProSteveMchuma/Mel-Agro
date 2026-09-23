"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { CartItem, Product, ProductVariant } from '@/types';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import {
    buildCartItem,
    cloudCartItemsFromDoc,
    resolveCartForAuthState,
    sanitizeCartItems,
} from '@/lib/cart-merge';

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

function readLocalCart(): CartItem[] {
    try {
        const localCart = localStorage.getItem('Mel-Agri_cart');
        if (!localCart) return [];
        return sanitizeCartItems(JSON.parse(localCart));
    } catch (e) {
        console.error('Failed to parse local cart', e);
        return [];
    }
}

async function persistCloudCart(
    user: { uid: string; name?: string; email?: string; phone?: string; cartRecoveryConsent?: boolean },
    items: CartItem[],
    status?: 'active' | 'cleared' | 'converted',
) {
    const nextStatus = status || (items.length > 0 ? 'active' : 'cleared');
    await setDoc(
        doc(db, 'carts', user.uid),
        {
            userId: user.uid,
            userName: user.name || 'Anonymous Farmer',
            userEmail: user.email || '',
            userPhone: user.phone || '',
            items,
            total: items.reduce((acc, item) => acc + item.price * item.quantity, 0),
            itemCount: items.reduce((acc, item) => acc + item.quantity, 0),
            updatedAt: new Date().toISOString(),
            status: nextStatus,
            recoveryConsent: user.cartRecoveryConsent === true,
            cartRecoveryConsent: user.cartRecoveryConsent === true,
        },
        { merge: true },
    );
}

export function CartProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    /** undefined = auth not settled yet; null = guest; string = last signed-in uid */
    const previousUserIdRef = useRef<string | null | undefined>(undefined);

    // Load cart only after auth settles so we do not re-merge local+cloud on every refresh.
    // Depend on uid (not the whole user object) so profile snapshot updates do not reload the cart.
    const userId = user?.uid ?? null;
    useEffect(() => {
        if (authLoading) return;

        let cancelled = false;
        setIsInitialLoad(true);

        const loadCart = async () => {
            const localItems = readLocalCart();
            const nextUserId = userId;
            let cloudItems: CartItem[] = [];

            if (nextUserId) {
                try {
                    const cartDoc = await getDoc(doc(db, 'carts', nextUserId));
                    if (cartDoc.exists()) {
                        cloudItems = cloudCartItemsFromDoc(cartDoc.data() as Record<string, unknown>);
                    }
                } catch (e) {
                    console.error('Failed to sync cloud cart', e);
                }
            }

            const resolved = resolveCartForAuthState({
                previousUserId: previousUserIdRef.current,
                nextUserId,
                localItems,
                cloudItems,
            });

            if (cancelled) return;
            previousUserIdRef.current = resolved.nextPreviousUserId;
            setCartItems(resolved.items);
            setIsInitialLoad(false);
        };

        void loadCart();
        return () => {
            cancelled = true;
        };
    }, [userId, authLoading]);

    // Persist to LocalStorage and Cloud after the load/merge settles.
    useEffect(() => {
        if (isInitialLoad || authLoading) return;

        const lean = sanitizeCartItems(cartItems);
        localStorage.setItem('Mel-Agri_cart', JSON.stringify(lean));

        if (user) {
            void persistCloudCart(user, lean).catch((e) => {
                console.error('Cloud cart sync failed', e);
            });
        }
    }, [cartItems, user, isInitialLoad, authLoading]);

    const addToCart = (product: Product, quantity = 1, variant?: ProductVariant) => {
        const availableStock = getAvailableStock(product, variant);
        if (product.inStock === false || availableStock < 1) {
            toast.error(`${product.name} is currently out of stock`);
            return false;
        }

        const requestedQuantity = Math.max(1, Math.floor(quantity));
        const line = buildCartItem(product, requestedQuantity, variant);
        if (!line) {
            toast.error('Could not add that product to the cart');
            return false;
        }

        import('@/lib/analytics').then(({ AnalyticsService }) => {
            AnalyticsService.logAddToCart(String(product.id));
        });

        const existing = cartItems.find((item) => item.cartItemId === line.cartItemId);
        const nextQuantity = (existing?.quantity || 0) + requestedQuantity;

        if (nextQuantity > availableStock) {
            toast.error(`Only ${availableStock} ${line.name} available`);
            return false;
        }

        if (existing) {
            setCartItems((prev) =>
                sanitizeCartItems(
                    prev.map((item) =>
                        item.cartItemId === line.cartItemId ? { ...item, quantity: nextQuantity } : item,
                    ),
                ),
            );
            toast.success(`Updated quantity for ${line.name}`);
        } else {
            setCartItems((prev) => sanitizeCartItems([...prev, line]));
            toast.success(`Added ${line.name} to cart`);
        }
        setIsCartOpen(true);
        return true;
    };

    const removeFromCart = (cartItemId: string) => {
        setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
        toast.success('Removed from cart');
    };

    const updateQuantity = (cartItemId: string, quantity: number) => {
        if (quantity < 1) return;
        setCartItems((prev) =>
            prev.map((item) => {
                if (item.cartItemId !== cartItemId) return item;
                const availableStock = getAvailableStock(item, item.selectedVariant);
                if (quantity > availableStock) {
                    toast.error(`Only ${availableStock} ${item.name} available`);
                    return item;
                }
                return { ...item, quantity };
            }),
        );
    };

    const clearCart = () => {
        setCartItems([]);
        localStorage.setItem('Mel-Agri_cart', JSON.stringify([]));
        if (user) {
            void persistCloudCart(user, [], 'cleared').catch((e) => {
                console.error('Cloud cart clear failed', e);
            });
        }
    };

    const toggleCart = () => {
        setIsCartOpen((prev) => !prev);
    };

    const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                cartTotal,
                cartCount,
                isCartOpen,
                toggleCart,
            }}
        >
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
