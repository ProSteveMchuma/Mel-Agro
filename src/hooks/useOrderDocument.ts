'use client';

import { useEffect, useState } from 'react';
import type { Order } from '@/types';
import { waitForAuthToken } from '@/lib/wait-for-auth-token';

type State =
    | { status: 'loading'; order: null; error: null }
    | { status: 'ready'; order: Order; error: null }
    | { status: 'error'; order: null; error: string };

/**
 * Load an order for printable documents: prefer context seed when present,
 * otherwise fetch via /api/orders/[id]/document (auth or ?t= token).
 *
 * Waits for Firebase Auth to hydrate before fetching so admins opening
 * receipt/invoice/delivery-note in a new tab are not rejected as anonymous.
 */
export function useOrderDocument(orderId: string | undefined, seed?: Order | null) {
    const [state, setState] = useState<State>({ status: 'loading', order: null, error: null });

    useEffect(() => {
        if (!orderId) {
            setState({ status: 'error', order: null, error: 'Missing order id' });
            return;
        }

        if (seed && String(seed.id) === String(orderId)) {
            setState({ status: 'ready', order: seed, error: null });
            return;
        }

        let cancelled = false;
        (async () => {
            setState({ status: 'loading', order: null, error: null });
            try {
                const access = typeof window !== 'undefined'
                    ? (new URLSearchParams(window.location.search).get('t')
                        || new URLSearchParams(window.location.search).get('token'))
                    : null;
                // SMS token links can fetch immediately; signed-in staff need auth ready.
                const token = access ? null : await waitForAuthToken();
                const url = new URL(`/api/orders/${encodeURIComponent(orderId)}/document`, window.location.origin);
                if (access) url.searchParams.set('t', access);

                const response = await fetch(url.toString(), {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                const data = await response.json().catch(() => ({}));
                if (cancelled) return;
                if (!response.ok || !data.order) {
                    setState({
                        status: 'error',
                        order: null,
                        error: data.message || 'Unable to load this order document.',
                    });
                    return;
                }
                setState({ status: 'ready', order: data.order as Order, error: null });
            } catch {
                if (!cancelled) {
                    setState({ status: 'error', order: null, error: 'Unable to load this order document.' });
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [orderId, seed]);

    return state;
}
