import type { CartItem } from '@/types';

/** Stable line key: product + variant (falls back to product id). */
export function cartLineKey(item: {
    cartItemId?: string | null;
    id?: string | number | null;
    selectedVariant?: { id?: string | number | null } | null;
}): string {
    const explicit = String(item.cartItemId || '').trim();
    if (explicit) return explicit;
    const productId = String(item.id ?? '');
    const variantId = item.selectedVariant?.id != null ? String(item.selectedVariant.id) : '';
    return variantId ? `${productId}-${variantId}` : productId;
}

function stockCap(item: CartItem): number {
    const raw = item.selectedVariant?.stockQuantity
        ?? item.stockQuantity
        ?? item.stock
        ?? 0;
    const stock = Number(raw);
    return Number.isFinite(stock) && stock > 0 ? stock : 0;
}

function normalizeLine(item: CartItem): CartItem {
    const key = cartLineKey(item);
    const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    return { ...item, cartItemId: key, quantity };
}

export function normalizeCartItems(items: CartItem[]): CartItem[] {
    const map = new Map<string, CartItem>();
    for (const raw of items) {
        if (!raw || raw.id == null) continue;
        const line = normalizeLine(raw);
        const existing = map.get(line.cartItemId);
        if (!existing) {
            map.set(line.cartItemId, line);
            continue;
        }
        const summed = existing.quantity + line.quantity;
        const cap = stockCap(line) || stockCap(existing);
        map.set(line.cartItemId, {
            ...existing,
            ...line,
            quantity: cap > 0 ? Math.min(summed, cap) : summed,
        });
    }
    return Array.from(map.values());
}

/**
 * Merge guest (local) and account (cloud) carts by line key.
 * Quantities are summed; when stock is known on either line, the total is capped.
 * Local line fields win for price/name/image so the freshest browse session sticks.
 */
export function mergeCartItems(localItems: CartItem[], cloudItems: CartItem[]): CartItem[] {
    const map = new Map<string, CartItem>();

    for (const raw of cloudItems) {
        if (!raw || raw.id == null) continue;
        const line = normalizeLine(raw);
        map.set(line.cartItemId, line);
    }

    for (const raw of localItems) {
        if (!raw || raw.id == null) continue;
        const line = normalizeLine(raw);
        const existing = map.get(line.cartItemId);
        if (!existing) {
            map.set(line.cartItemId, line);
            continue;
        }

        const summed = existing.quantity + line.quantity;
        const cap = stockCap(line) || stockCap(existing);
        const quantity = cap > 0 ? Math.min(summed, cap) : summed;
        map.set(line.cartItemId, {
            ...existing,
            ...line,
            cartItemId: line.cartItemId,
            quantity,
            selectedVariant: line.selectedVariant ?? existing.selectedVariant,
        });
    }

    return Array.from(map.values());
}

/**
 * Decide which cart to show when auth state settles.
 *
 * - Guest (`nextUserId` null): local only.
 * - Login / account switch (`previousUserId` was null or a different uid): sum-merge once.
 * - Cold refresh while already signed in (`previousUserId` undefined, or same uid):
 *   cloud is source of truth (local is only a cache of the last sync — summing would double).
 */
export function resolveCartForAuthState(args: {
    previousUserId: string | null | undefined;
    nextUserId: string | null;
    localItems: CartItem[];
    cloudItems: CartItem[];
}): { items: CartItem[]; nextPreviousUserId: string | null } {
    const { previousUserId, nextUserId, localItems, cloudItems } = args;

    if (!nextUserId) {
        return { items: normalizeCartItems(localItems), nextPreviousUserId: null };
    }

    const loggedInFromGuest = previousUserId === null;
    const switchedAccount = typeof previousUserId === 'string' && previousUserId !== nextUserId;
    if (loggedInFromGuest || switchedAccount) {
        return {
            items: mergeCartItems(localItems, cloudItems),
            nextPreviousUserId: nextUserId,
        };
    }

    if (cloudItems.length > 0) {
        return { items: normalizeCartItems(cloudItems), nextPreviousUserId: nextUserId };
    }

    return { items: normalizeCartItems(localItems), nextPreviousUserId: nextUserId };
}
