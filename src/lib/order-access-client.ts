'use client';

import { getAuth } from 'firebase/auth';
import type { OrderAccessAction } from '@/lib/order-access';

export type PublicOrder = {
    id: string;
    shortId: string;
    userName: string;
    phoneMasked: string;
    date: string | null;
    deliveredAt?: string | null;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    total: number;
    shippingCost: number;
    shippingMethod: string | null;
    shippingAddress: { county: string; details: string; method: string | null } | null;
    items: Array<{ id: string; name: string; quantity: number; price: number }>;
    returnStatus: string | null;
    returnReason: string | null;
    returnEligible?: boolean;
    returnBlockedReason?: string | null;
    mpesaReceiptNumber: string | null;
};

export type OrderAccessResponse = {
    success: boolean;
    message?: string;
    order?: PublicOrder;
    action?: string;
    access?: 'auth' | 'token';
    otpRequired?: boolean;
    canPay?: boolean;
};

async function authHeaders(): Promise<Record<string, string>> {
    const token = await getAuth().currentUser?.getIdToken().catch(() => null);
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export function readAccessTokenFromSearch(search: string | URLSearchParams): string {
    const params = typeof search === 'string' ? new URLSearchParams(search) : search;
    return String(params.get('t') || params.get('token') || '').trim();
}

export function returnSessionStorageKey(orderId: string) {
    return `melagri-return-session:${orderId}`;
}

export function readReturnSessionToken(orderId: string): string {
    if (typeof window === 'undefined') return '';
    try {
        return String(sessionStorage.getItem(returnSessionStorageKey(orderId)) || '').trim();
    } catch {
        return '';
    }
}

export function writeReturnSessionToken(orderId: string, token: string | null) {
    if (typeof window === 'undefined') return;
    try {
        const key = returnSessionStorageKey(orderId);
        if (!token) sessionStorage.removeItem(key);
        else sessionStorage.setItem(key, token);
    } catch {
        // ignore quota / private mode
    }
}

export async function fetchOrderAccess(args: {
    orderId: string;
    action: Exclude<OrderAccessAction, 'rs'>;
    accessToken?: string | null;
}): Promise<OrderAccessResponse> {
    const params = new URLSearchParams({ action: args.action });
    if (args.accessToken) params.set('t', args.accessToken);
    const headers = await authHeaders();
    const res = await fetch(`/api/orders/${encodeURIComponent(args.orderId)}/access?${params}`, {
        headers,
        cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    return { ...data, success: Boolean(data.success) && res.ok };
}

export async function postOrderJson<T extends Record<string, unknown> = Record<string, unknown>>(
    path: string,
    body: Record<string, unknown>,
): Promise<T & { success: boolean; message?: string; status: number }> {
    const headers = await authHeaders();
    const res = await fetch(path, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ...data, success: Boolean(data.success) && res.ok, status: res.status };
}
