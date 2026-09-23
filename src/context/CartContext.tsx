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
import { createCartWriteQueue, shouldApplyLoadedCart } from '@/lib/cart-write-queue';

interface CartContextType {
    cartItems: CartItem[];
    addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => boolean;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    clearCart: (options?: { status?: 'cleared' | 'converted'; lastOrderId?: string }) => void;
    cartTotal: number;
    cartCount: number;
    isCartOpen: boolean;
    toggleCart: () => void;
    /** True until the first auth-aware cart load finishes. */
    isCartReady: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_CART_KEY = 'Mel-Agri_cart';

function getAvailableStock(product: Product, variant?: ProductVariant): number {
    const rawStock = variant?.stockQuantity ?? product.stockQuantity ?? product.stock ?? 0;
    const stock = Number(rawStock);
    return Number.isFinite(stock) ? Math.max(0, stock) : 0;
}

function readLocalCart(): CartItem[] {
    try {
        const localCart = localStorage.getItem(LOCAL_CART_KEY);
        if (!localCart) return [];
        return sanitizeCartItems(JSON.parse(localCart));
    } catch (e) {
        console.error('Failed to parse local cart', e);
        return [];
    }
}

function writeLocalCart(items: CartItem[]): CartItem[] {
    const lean = sanitizeCartItems(items);
    try {
        localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(lean));
    } catch (e) {
        console.error('Failed to write local cart', e);
    }
    return lean;
}

export function CartProvider({ children }: { children: ReactNode }) {
    const { user, isLoading: authLoading } = useAuth();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    /** undefined = auth not settled yet; null = guest; string = last signed-in uid */
    const previousUserIdRef = useRef<string | null | undefined>(undefined);
    const cartItemsRef = useRef<CartItem[]>([]);
    /** Bumped on every local mutation so an in-flight load cannot clobber newer edits. */
    const mutationGenerationRef = useRef(0);
    const writeQueueRef = useRef(createCartWriteQueue());
    /** Last uid we successfully targeted for cloud writes (avoids writing under a stale user object). */
    const cloudUserIdRef = useRef<string | null>(null);
    /** When clearCart already enqueued an authoritative empty write, skip the persist effect's duplicate. */
    const skipNextEmptyPersistRef = useRef(false);

    const userId = user?.uid ?? null;
    const recoveryConsent = user?.cartRecoveryConsent === true;

    useEffect(() => {
        cartItemsRef.current = cartItems;
    }, [cartItems]);

    const enqueueCloudPersist = (
        targetUser: { uid: string; name?: string; email?: string; phone?: string },
        items: CartItem[],
        status?: 'active' | 'cleared' | 'converted',
        extra?: { lastOrderId?: string; convertedAt?: string },
    ) => {
        const lean = sanitizeCartItems(items);
        const nextStatus = status || (lean.length > 0 ? 'active' : 'cleared');
        cloudUserIdRef.current = targetUser.uid;

        return writeQueueRef.current.enqueue(async () => {
            // Drop writes if the shopper signed out / switched accounts since enqueue.
            if (cloudUserIdRef.current !== targetUser.uid) return;

            await setDoc(
                doc(db, 'carts', targetUser.uid),
                {
                    userId: targetUser.uid,
                    userName: targetUser.name || 'Anonymous Farmer',
                    userEmail: targetUser.email || '',
                    userPhone: targetUser.phone || '',
                    items: lean,
                    total: lean.reduce((acc, item) => acc + item.price * item.quantity, 0),
                    itemCount: lean.reduce((acc, item) => acc + item.quantity, 0),
                    updatedAt: new Date().toISOString(),
                    status: nextStatus,
                    recoveryConsent,
                    cartRecoveryConsent: recoveryConsent,
                    ...(extra?.lastOrderId ? { lastOrderId: extra.lastOrderId } : {}),
                    ...(extra?.convertedAt ? { convertedAt: extra.convertedAt } : {}),
                },
                { merge: true },
            );
        });
    };

    // Load cart only after auth settles so we do not re-merge local+cloud on every refresh.
    useEffect(() => {
        if (authLoading) return;

        let cancelled = false;
        setIsInitialLoad(true);
        const loadGeneration = mutationGenerationRef.current;

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

            if (cancelled) return;

            // Shopper edited the cart while we were fetching — keep their edits.
            if (!shouldApplyLoadedCart({
                loadGeneration,
                currentGeneration: mutationGenerationRef.current,
            })) {
                previousUserIdRef.current = nextUserId;
                setIsInitialLoad(false);
                return;
            }

            const resolved = resolveCartForAuthState({
                previousUserId: previousUserIdRef.current,
                nextUserId,
                localItems,
                cloudItems,
            });

            previousUserIdRef.current = resolved.nextPreviousUserId;
            cartItemsRef.current = resolved.items;
            setCartItems(resolved.items);
            writeLocalCart(resolved.items);
            setIsInitialLoad(false);
        };

        void loadCart();
        return () => {
            cancelled = true;
        };
    }, [userId, authLoading]);

    // Persist to cloud after hydrate. Local storage is written eagerly on each mutation.
    useEffect(() => {
        if (isInitialLoad || authLoading) return;
        if (!userId || !user) return;

        if (cartItems.length === 0 && skipNextEmptyPersistRef.current) {
            skipNextEmptyPersistRef.current = false;
            return;
        }

        void enqueueCloudPersist(user, cartItems).catch((e) => {
            console.error('Cloud cart sync failed', e);
        });
        // Intentionally depend on userId + consent flag, not the whole user object,
        // so profile snapshot noise does not re-fire persists.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartItems, userId, recoveryConsent, isInitialLoad, authLoading]);

    const commitItems = (next: CartItem[]) => {
        mutationGenerationRef.current += 1;
        const lean = writeLocalCart(next);
        cartItemsRef.current = lean;
        setCartItems(lean);
        return lean;
    };

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

        // Use the live ref (not a render closure) so rapid clicks merge into one
        // line instead of appending duplicates from a stale snapshot.
        const prev = cartItemsRef.current;
        const existing = prev.find((item) => item.cartItemId === line.cartItemId);
        const nextQuantity = (existing?.quantity || 0) + requestedQuantity;
        if (nextQuantity > availableStock) {
            toast.error(`Only ${availableStock} ${line.name} available`);
            return false;
        }

        const next = existing
            ? prev.map((item) =>
                item.cartItemId === line.cartItemId ? { ...item, quantity: nextQuantity } : item,
            )
            : [...prev, line];
        commitItems(next);

        import('@/lib/analytics').then(({ AnalyticsService }) => {
            AnalyticsService.logAddToCart(String(product.id));
        });

        toast.success(existing ? `Updated quantity for ${line.name}` : `Added ${line.name} to cart`);
        setIsCartOpen(true);
        return true;
    };

    const removeFromCart = (cartItemId: string) => {
        commitItems(cartItemsRef.current.filter((item) => item.cartItemId !== cartItemId));
        toast.success('Removed from cart');
    };

    const updateQuantity = (cartItemId: string, quantity: number) => {
        if (quantity < 1) return;
        const prev = cartItemsRef.current;
        const target = prev.find((item) => item.cartItemId === cartItemId);
        if (!target) return;
        const availableStock = getAvailableStock(target, target.selectedVariant);
        if (quantity > availableStock) {
            toast.error(`Only ${availableStock} ${target.name} available`);
            return;
        }
        commitItems(
            prev.map((item) => (item.cartItemId === cartItemId ? { ...item, quantity } : item)),
        );
    };

    const clearCart = (options?: { status?: 'cleared' | 'converted'; lastOrderId?: string }) => {
        const status = options?.status || 'cleared';
        // clearCart itself enqueues the empty cloud write — don't also fire the
        // persist effect for the same [] commit (that used to race status).
        skipNextEmptyPersistRef.current = true;
        commitItems([]);
        if (user) {
            void enqueueCloudPersist(
                user,
                [],
                status,
                status === 'converted'
                    ? {
                        lastOrderId: options?.lastOrderId,
                        convertedAt: new Date().toISOString(),
                    }
                    : undefined,
            ).catch((e) => {
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
                isCartReady: !isInitialLoad && !authLoading,
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
