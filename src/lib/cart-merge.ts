import type { CartItem, Product, ProductVariant } from '@/types';

const MAX_CART_LINES = 40;

/** Stable line key: product + variant (falls back to product id). */
export function cartLineKey(item: {
    cartItemId?: string | null;
    id?: string | number | null;
    selectedVariant?: { id?: string | number | null } | null;
}): string {
    // Never trust a stale/corrupt cartItemId that does not match product+variant —
    // always derive from id + variant so lines stay stable across sessions.
    const productId = String(item.id ?? '').trim();
    if (!productId) return '';
    const variantId = item.selectedVariant?.id != null ? String(item.selectedVariant.id).trim() : '';
    return variantId ? `${productId}-${variantId}` : productId;
}

function stockCap(item: Pick<CartItem, 'selectedVariant' | 'stockQuantity' | 'stock'>): number {
    const raw = item.selectedVariant?.stockQuantity
        ?? item.stockQuantity
        ?? item.stock
        ?? 0;
    const stock = Number(raw);
    return Number.isFinite(stock) && stock > 0 ? stock : 0;
}

function sanitizeVariant(raw: unknown): ProductVariant | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const variant = raw as Record<string, unknown>;
    const id = String(variant.id ?? '').trim();
    if (!id) return undefined;
    const name = String(variant.name ?? '').trim() || id;
    const stockQuantity = Math.max(0, Math.floor(Number(variant.stockQuantity) || 0));
    const price = variant.price != null ? Number(variant.price) : undefined;
    return {
        id,
        name,
        stockQuantity,
        ...(Number.isFinite(price) ? { price } : {}),
        ...(typeof variant.sku === 'string' ? { sku: variant.sku } : {}),
        ...(typeof variant.image === 'string' ? { image: variant.image } : {}),
        ...(variant.weight != null && Number.isFinite(Number(variant.weight))
            ? { weight: Number(variant.weight) }
            : {}),
    };
}

/**
 * Build a lean cart line from a product (never spread the full catalogue document —
 * that used to drag extra fields into localStorage/Firestore and confuse merges).
 */
export function buildCartItem(
    product: Product,
    quantity: number,
    variant?: ProductVariant,
): CartItem | null {
    const id = String(product?.id ?? '').trim();
    const name = String(product?.name ?? '').trim();
    if (!id || !name) return null;

    const selectedVariant = variant ? sanitizeVariant(variant) : undefined;
    if (variant && !selectedVariant) return null;

    const unitPrice = Number(selectedVariant?.price ?? product.price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return null;

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const image = String(
        selectedVariant?.image || product.image || (Array.isArray(product.images) ? product.images[0] : '') || '',
    );
    const stockQuantity = Number(
        selectedVariant?.stockQuantity ?? product.stockQuantity ?? product.stock ?? 0,
    );

    return {
        id,
        name: selectedVariant ? `${name} (${selectedVariant.name})` : name,
        price: unitPrice,
        category: String(product.category || ''),
        image,
        images: Array.isArray(product.images) ? product.images.filter((value) => typeof value === 'string') : undefined,
        brand: product.brand ? String(product.brand) : undefined,
        productCode: product.productCode ? String(product.productCode) : undefined,
        rating: Number(product.rating) || 0,
        reviews: Number(product.reviews) || 0,
        inStock: product.inStock !== false,
        stockQuantity: Number.isFinite(stockQuantity) ? Math.max(0, stockQuantity) : 0,
        lowStockThreshold: Number(product.lowStockThreshold) || 0,
        cartItemId: cartLineKey({ id, selectedVariant }),
        quantity: qty,
        ...(selectedVariant ? { selectedVariant } : {}),
    };
}

/** Keep only valid, lean cart lines — drops converted-cart leftovers and corrupt payloads. */
export function sanitizeCartItems(raw: unknown): CartItem[] {
    if (!Array.isArray(raw)) return [];
    const map = new Map<string, CartItem>();

    for (const entry of raw) {
        if (!entry || typeof entry !== 'object') continue;
        const record = entry as Record<string, unknown>;
        const selectedVariant = sanitizeVariant(record.selectedVariant);
        const built = buildCartItem(
            {
                id: record.id as string | number,
                name: String(record.name || ''),
                // Prefer unit price stored on the line; strip "(variant)" suffix noise on re-build by using raw name.
                price: Number(record.price),
                category: String(record.category || ''),
                image: String(record.image || ''),
                images: Array.isArray(record.images) ? (record.images as string[]) : undefined,
                brand: record.brand != null ? String(record.brand) : undefined,
                productCode: record.productCode != null ? String(record.productCode) : undefined,
                rating: Number(record.rating) || 0,
                reviews: Number(record.reviews) || 0,
                inStock: record.inStock !== false,
                stockQuantity: Number(record.stockQuantity ?? record.stock ?? 0),
                lowStockThreshold: Number(record.lowStockThreshold) || 0,
            } as Product,
            Number(record.quantity) || 1,
            selectedVariant,
        );
        if (!built) continue;

        // Preserve the display name already on the line when present (avoids double "(size)" suffixes).
        const displayName = String(record.name || '').trim();
        const line: CartItem = {
            ...built,
            name: displayName || built.name,
            quantity: built.quantity,
        };

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

    return Array.from(map.values()).slice(0, MAX_CART_LINES);
}

export function normalizeCartItems(items: CartItem[]): CartItem[] {
    return sanitizeCartItems(items);
}

/**
 * Merge guest (local) and account (cloud) carts by line key.
 * Quantities are summed; when stock is known on either line, the total is capped.
 * Local line fields win for price/name/image so the freshest browse session sticks.
 */
export function mergeCartItems(localItems: CartItem[], cloudItems: CartItem[]): CartItem[] {
    return sanitizeCartItems([...(cloudItems || []), ...(localItems || [])]);
}

/** Cloud carts marked converted/cleared must not resurrect old order lines. */
export function cloudCartItemsFromDoc(data: Record<string, unknown> | undefined | null): CartItem[] {
    if (!data) return [];
    const status = String(data.status || '');
    if (status === 'converted' || status === 'cleared') return [];
    return sanitizeCartItems(data.items);
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
    const local = sanitizeCartItems(localItems);
    const cloud = sanitizeCartItems(cloudItems);

    if (!nextUserId) {
        return { items: local, nextPreviousUserId: null };
    }

    const loggedInFromGuest = previousUserId === null;
    const switchedAccount = typeof previousUserId === 'string' && previousUserId !== nextUserId;
    if (loggedInFromGuest || switchedAccount) {
        return {
            items: mergeCartItems(local, cloud),
            nextPreviousUserId: nextUserId,
        };
    }

    if (cloud.length > 0) {
        return { items: cloud, nextPreviousUserId: nextUserId };
    }

    return { items: local, nextPreviousUserId: nextUserId };
}
