'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { MPESA_TILL_DISPLAY } from '@/lib/site';
import {
    fetchOrderAccess,
    postOrderJson,
    readAccessTokenFromSearch,
    type PublicOrder,
} from '@/lib/order-access-client';
import {
    OrderAccessError,
    OrderAccessFrame,
    OrderAccessLoading,
    OrderSummaryCard,
} from '@/components/orders/OrderAccessUi';

export default function OrderPayPage() {
    return (
        <Suspense fallback={<OrderAccessFrame title="Pay for your order"><OrderAccessLoading /></OrderAccessFrame>}>
            <OrderPayInner />
        </Suspense>
    );
}

function OrderPayInner() {
    const params = useParams();
    const searchParams = useSearchParams();
    const orderId = String(params.id || '');
    const accessToken = readAccessTokenFromSearch(searchParams);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [order, setOrder] = useState<PublicOrder | null>(null);
    const [canPay, setCanPay] = useState(false);
    const [phone, setPhone] = useState('');
    const [receipt, setReceipt] = useState('');
    const [busy, setBusy] = useState<'stk' | 'claim' | null>(null);

    const reload = async () => {
        const result = await fetchOrderAccess({ orderId, action: 'pay', accessToken });
        if (!result.success || !result.order) {
            setError(result.message || 'Could not open this payment link');
            setOrder(null);
            setCanPay(false);
            return;
        }
        setError('');
        setOrder(result.order);
        setCanPay(Boolean(result.canPay));
    };

    useEffect(() => {
        if (!orderId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            await reload();
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId, accessToken]);

    const signInHref = `/auth/login?callbackUrl=${encodeURIComponent(`/orders/${orderId}/pay${accessToken ? `?t=${encodeURIComponent(accessToken)}` : ''}`)}`;

    const sendStk = async () => {
        setBusy('stk');
        const notice = toast.loading('Sending M-Pesa prompt...');
        try {
            const result = await postOrderJson(`/api/orders/${encodeURIComponent(orderId)}/pay/stk`, {
                accessToken,
                ...(phone.trim() ? { phoneNumber: phone.trim() } : {}),
            });
            if (!result.success) {
                toast.error(result.message || 'Could not send M-Pesa prompt', { id: notice });
                return;
            }
            toast.success(result.message || 'Check your phone and enter your M-Pesa PIN', { id: notice, duration: 6000 });
            await reload();
        } catch (err: any) {
            toast.error(err?.message || 'Payment failed', { id: notice });
        } finally {
            setBusy(null);
        }
    };

    const claimReceipt = async (event: React.FormEvent) => {
        event.preventDefault();
        const transactionCode = receipt.trim();
        if (!transactionCode) {
            toast.error('Enter the M-Pesa code from your SMS');
            return;
        }
        setBusy('claim');
        const notice = toast.loading('Checking your M-Pesa code...');
        try {
            const result = await postOrderJson(`/api/orders/${encodeURIComponent(orderId)}/pay/claim`, {
                accessToken,
                transactionCode,
            });
            if (!result.success) {
                toast.error(result.message || 'Could not verify that code', { id: notice });
                return;
            }
            toast.success(result.message || 'Submitted', { id: notice, duration: 6000 });
            await reload();
        } catch (err: any) {
            toast.error(err?.message || 'Could not submit the code', { id: notice });
        } finally {
            setBusy(null);
        }
    };

    return (
        <OrderAccessFrame
            title="Complete payment"
            subtitle="Pay with M-Pesa from this link — no sign-in required while the link is valid."
        >
            {loading ? <OrderAccessLoading /> : null}
            {!loading && error ? <OrderAccessError message={error} signInHref={signInHref} /> : null}
            {!loading && order ? (
                <div className="space-y-4">
                    <OrderSummaryCard order={order} accessToken={accessToken} highlight="pay" />

                    {canPay ? (
                        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 md:p-6">
                            <h2 className="text-sm font-black uppercase tracking-widest text-emerald-950 mb-2">
                                Pay with M-Pesa
                            </h2>
                            <p className="text-sm text-emerald-900 mb-4">
                                We will send a prompt to the phone on this order
                                {order.phoneMasked ? ` (${order.phoneMasked})` : ''}. Enter your PIN to finish.
                            </p>

                            <label className="block text-xs font-black uppercase tracking-widest text-emerald-950 mb-1">
                                Use a different M-Pesa number (optional)
                            </label>
                            <input
                                type="tel"
                                inputMode="tel"
                                placeholder="07XX XXX XXX"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full min-h-11 px-3 rounded-xl border border-emerald-200 bg-white text-sm outline-none focus:ring-2 focus:ring-melagri-primary/20 focus:border-melagri-primary mb-4"
                            />

                            <button
                                type="button"
                                disabled={busy !== null}
                                onClick={sendStk}
                                className="w-full min-h-12 rounded-xl bg-melagri-primary text-white font-bold hover:bg-melagri-secondary disabled:opacity-60"
                            >
                                {busy === 'stk' ? 'Sending...' : `Pay KES ${order.total.toLocaleString()} via STK`}
                            </button>

                            <div className="mt-5 rounded-xl border border-emerald-200 bg-white/80 p-4 text-sm text-emerald-950">
                                <p className="font-bold mb-1">Or pay to Till {MPESA_TILL_DISPLAY}</p>
                                <p className="text-xs text-emerald-800">
                                    Lipa na M-Pesa → Buy Goods → Till <strong>{MPESA_TILL_DISPLAY}</strong> → Amount KES {order.total.toLocaleString()}.
                                    Then enter your M-Pesa code below.
                                </p>
                            </div>

                            <form onSubmit={claimReceipt} className="mt-4 pt-4 border-t border-emerald-200/80">
                                <label htmlFor="mpesa-code" className="block text-xs font-black uppercase tracking-widest text-emerald-950">
                                    Already paid? Enter your M-Pesa code
                                </label>
                                <div className="mt-2 flex flex-col sm:flex-row gap-2">
                                    <input
                                        id="mpesa-code"
                                        type="text"
                                        autoCapitalize="characters"
                                        autoComplete="off"
                                        spellCheck={false}
                                        placeholder="e.g. TJK7H8K9L0"
                                        value={receipt}
                                        disabled={busy !== null}
                                        onChange={(e) => setReceipt(e.target.value.toUpperCase())}
                                        className="flex-1 min-h-11 px-3 rounded-xl border border-emerald-200 bg-white font-mono text-sm tracking-widest uppercase outline-none focus:ring-2 focus:ring-melagri-primary/20"
                                    />
                                    <button
                                        type="submit"
                                        disabled={busy !== null || !receipt.trim()}
                                        className="min-h-11 px-4 rounded-xl bg-white border border-emerald-300 text-emerald-950 text-xs font-bold hover:bg-emerald-100 disabled:opacity-60"
                                    >
                                        {busy === 'claim' ? 'Checking...' : 'Confirm with code'}
                                    </button>
                                </div>
                            </form>
                        </section>
                    ) : (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
                            {order.paymentStatus === 'Paid'
                                ? 'This order is already paid. Asante!'
                                : 'Payment is not available for this order right now.'}
                        </div>
                    )}
                </div>
            ) : null}
        </OrderAccessFrame>
    );
}
