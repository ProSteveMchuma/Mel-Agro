'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductRow from '@/components/ProductRow';
import type { Product } from '@/lib/products';
import { readRecentlyViewed } from '@/lib/recently-viewed';
import { useBehavior } from '@/context/BehaviorContext';
import { useProducts } from '@/context/ProductContext';

export default function RecentlyViewed({
    products: seedProducts,
    excludeId,
    title = 'Recently viewed',
}: {
    products?: Product[];
    excludeId?: string;
    title?: string;
}) {
    const { personalizationEnabled } = useBehavior();
    const { products: liveProducts } = useProducts();
    const [ids, setIds] = useState<string[]>([]);

    useEffect(() => {
        setIds(readRecentlyViewed().map((entry) => entry.id));
    }, []);

    const catalog = liveProducts.length ? liveProducts : (seedProducts || []);

    const items = useMemo(() => {
        if (!personalizationEnabled || !ids.length) return [];
        const byId = new Map(catalog.map((product) => [String(product.id), product as Product]));
        return ids
            .filter((id) => id !== String(excludeId || ''))
            .map((id) => byId.get(id))
            .filter((product): product is Product => Boolean(product))
            .slice(0, 8);
    }, [catalog, ids, excludeId, personalizationEnabled]);

    if (!items.length) return null;

    return (
        <section className="space-y-4" aria-labelledby="recently-viewed-heading">
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Continue browsing</p>
                <h2 id="recently-viewed-heading" className="text-xl font-black tracking-tight text-gray-900 md:text-2xl">
                    {title}
                </h2>
            </div>
            <ProductRow products={items} />
        </section>
    );
}
