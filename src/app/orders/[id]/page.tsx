'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
    fetchOrderAccess,
    readAccessTokenFromSearch,
    type PublicOrder,
} from '@/lib/order-access-client';
import {
    OrderAccessError,
    OrderAccessFrame,
    OrderAccessLoading,
    OrderSummaryCard,
} from '@/components/orders/OrderAccessUi';

export default function OrderTrackPage() {
    return (
        <Suspense fallback={<OrderAccessFrame title="Your order"><OrderAccessLoading /></OrderAccessFrame>}>
            <OrderTrackInner />
        </Suspense>
    );
}

function OrderTrackInner() {
    const params = useParams();
    const searchParams = useSearchParams();
    const orderId = String(params.id || '');
    const accessToken = readAccessTokenFromSearch(searchParams);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [order, setOrder] = useState<PublicOrder | null>(null);

    useEffect(() => {
        if (!orderId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            const result = await fetchOrderAccess({ orderId, action: 'view', accessToken });
            if (cancelled) return;
            if (!result.success || !result.order) {
                setError(result.message || 'Could not open this order link');
                setOrder(null);
            } else {
                setOrder(result.order);
            }
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [orderId, accessToken]);

    const signInHref = `/auth/login?callbackUrl=${encodeURIComponent(`/orders/${orderId}${accessToken ? `?t=${encodeURIComponent(accessToken)}` : ''}`)}`;

    return (
        <OrderAccessFrame
            title="Track your order"
            subtitle="Status updates from your Mel-Agri SMS link."
        >
            {loading ? <OrderAccessLoading /> : null}
            {!loading && error ? <OrderAccessError message={error} signInHref={signInHref} /> : null}
            {!loading && order ? (
                <OrderSummaryCard
                    order={order}
                    accessToken={accessToken}
                    highlight="view"
                    onCancelled={setOrder}
                />
            ) : null}
        </OrderAccessFrame>
    );
}
