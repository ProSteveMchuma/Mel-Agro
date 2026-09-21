'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
    fetchOrderAccess,
    postOrderJson,
    readAccessTokenFromSearch,
    readReturnSessionToken,
    writeReturnSessionToken,
    type PublicOrder,
} from '@/lib/order-access-client';
import {
    OrderAccessError,
    OrderAccessFrame,
    OrderAccessLoading,
    OrderSummaryCard,
} from '@/components/orders/OrderAccessUi';

export default function OrderReturnPage() {
    return (
        <Suspense fallback={<OrderAccessFrame title="Request a return"><OrderAccessLoading /></OrderAccessFrame>}>
            <OrderReturnInner />
        </Suspense>
    );
}

function OrderReturnInner() {
    const params = useParams();
    const searchParams = useSearchParams();
    const orderId = String(params.id || '');
    const accessToken = readAccessTokenFromSearch(searchParams);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [order, setOrder] = useState<PublicOrder | null>(null);
    const [otpRequired, setOtpRequired] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState('');
    const [returnSessionToken, setReturnSessionToken] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState<'send' | 'verify' | 'submit' | null>(null);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!orderId) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            const result = await fetchOrderAccess({ orderId, action: 'return', accessToken });
            if (cancelled) return;
            if (!result.success || !result.order) {
                setError(result.message || 'Could not open this return link');
                setOrder(null);
            } else {
                setOrder(result.order);
                const needsOtp = Boolean(result.otpRequired);
                setOtpRequired(needsOtp);
                if (result.order.returnStatus) setSubmitted(true);
                if (needsOtp) {
                    const existing = readReturnSessionToken(orderId);
                    if (existing) setReturnSessionToken(existing);
                } else {
                    setReturnSessionToken('');
                }
            }
            setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [orderId, accessToken]);

    const verified = !otpRequired || Boolean(returnSessionToken);
    const signInHref = `/auth/login?callbackUrl=${encodeURIComponent(`/orders/${orderId}/return${accessToken ? `?t=${encodeURIComponent(accessToken)}` : ''}`)}`;

    const sendOtp = async () => {
        setBusy('send');
        const notice = toast.loading('Sending verification code...');
        try {
            const result = await postOrderJson(`/api/orders/${encodeURIComponent(orderId)}/return/otp/send`, {
                accessToken,
            });
            if (!result.success) {
                toast.error(result.message || 'Could not send code', { id: notice });
                return;
            }
            if ((result as any).skipped) {
                setOtpRequired(false);
                setReturnSessionToken('');
                writeReturnSessionToken(orderId, null);
                toast.success('You are already signed in', { id: notice });
                return;
            }
            setOtpSent(true);
            toast.success(result.message || 'Code sent by SMS', { id: notice });
        } catch (err: any) {
            toast.error(err?.message || 'Could not send code', { id: notice });
        } finally {
            setBusy(null);
        }
    };

    const verifyOtp = async (event: React.FormEvent) => {
        event.preventDefault();
        if (otp.length < 4) {
            toast.error('Enter the SMS verification code');
            return;
        }
        setBusy('verify');
        const notice = toast.loading('Verifying code...');
        try {
            const result = await postOrderJson<{ returnSessionToken?: string | null }>(
                `/api/orders/${encodeURIComponent(orderId)}/return/otp/verify`,
                { accessToken, code: otp },
            );
            if (!result.success) {
                toast.error(result.message || 'Invalid code', { id: notice });
                return;
            }
            const session = String(result.returnSessionToken || '');
            if (session) {
                writeReturnSessionToken(orderId, session);
                setReturnSessionToken(session);
            } else {
                setOtpRequired(false);
                writeReturnSessionToken(orderId, null);
            }
            toast.success(result.message || 'Phone verified', { id: notice });
        } catch (err: any) {
            toast.error(err?.message || 'Verification failed', { id: notice });
        } finally {
            setBusy(null);
        }
    };

    const submitReturn = async (event: React.FormEvent) => {
        event.preventDefault();
        const trimmed = reason.trim();
        if (trimmed.length < 8) {
            toast.error('Tell us why you are returning this order.');
            return;
        }
        setBusy('submit');
        const notice = toast.loading('Submitting return request...');
        try {
            const result = await postOrderJson<{ order?: PublicOrder }>(
                `/api/orders/${encodeURIComponent(orderId)}/return`,
                {
                    accessToken,
                    returnSessionToken: returnSessionToken || undefined,
                    reason: trimmed,
                },
            );
            if (!result.success) {
                if ((result as any).otpRequired) {
                    writeReturnSessionToken(orderId, null);
                    setReturnSessionToken('');
                    setOtpSent(false);
                }
                toast.error(result.message || 'Could not submit return', { id: notice });
                return;
            }
            if (result.order) setOrder(result.order);
            setSubmitted(true);
            writeReturnSessionToken(orderId, null);
            toast.success(result.message || 'Return requested', { id: notice });
        } catch (err: any) {
            toast.error(err?.message || 'Could not submit return', { id: notice });
        } finally {
            setBusy(null);
        }
    };

    return (
        <OrderAccessFrame
            title="Request a return"
            subtitle="Guests confirm with a one-time SMS code. Signed-in owners can continue without OTP."
        >
            {loading ? <OrderAccessLoading /> : null}
            {!loading && error ? <OrderAccessError message={error} signInHref={signInHref} /> : null}
            {!loading && order ? (
                <div className="space-y-4">
                    <OrderSummaryCard
                        order={order}
                        accessToken={accessToken}
                        highlight="return"
                        onCancelled={setOrder}
                    />

                    {submitted || order.returnStatus ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
                            <p className="font-bold">Return status: {order.returnStatus || 'Requested'}</p>
                            {order.returnReason ? <p className="mt-2">Reason: {order.returnReason}</p> : null}
                            <p className="mt-2 text-xs text-amber-800">We will update you by SMS once we review this request.</p>
                        </div>
                    ) : !order.returnEligible ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
                            {order.returnBlockedReason || 'This order is not eligible for a return right now.'}
                        </div>
                    ) : (
                        <>
                            {otpRequired && !verified ? (
                                <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 md:p-6">
                                    <h2 className="text-sm font-black uppercase tracking-widest text-amber-950 mb-2">
                                        Verify your phone
                                    </h2>
                                    <p className="text-sm text-amber-900 mb-4">
                                        For your security we send a one-time code to {order.phoneMasked} before accepting a return.
                                    </p>
                                    {!otpSent ? (
                                        <button
                                            type="button"
                                            disabled={busy !== null}
                                            onClick={sendOtp}
                                            className="w-full min-h-12 rounded-xl bg-melagri-primary text-white font-bold hover:bg-melagri-secondary disabled:opacity-60"
                                        >
                                            {busy === 'send' ? 'Sending...' : 'Send SMS code'}
                                        </button>
                                    ) : (
                                        <form onSubmit={verifyOtp} className="space-y-3">
                                            <label htmlFor="return-otp" className="block text-xs font-black uppercase tracking-widest text-amber-950">
                                                Enter 6-digit code
                                            </label>
                                            <input
                                                id="return-otp"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                className="w-full min-h-12 px-3 rounded-xl border border-amber-200 bg-white font-mono text-center text-xl tracking-[0.4em] outline-none focus:ring-2 focus:ring-melagri-primary/20"
                                                placeholder="••••••"
                                            />
                                            <button
                                                type="submit"
                                                disabled={busy !== null || otp.length < 4}
                                                className="w-full min-h-12 rounded-xl bg-melagri-primary text-white font-bold hover:bg-melagri-secondary disabled:opacity-60"
                                            >
                                                {busy === 'verify' ? 'Verifying...' : 'Verify and continue'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busy !== null}
                                                onClick={sendOtp}
                                                className="w-full text-xs font-semibold text-amber-900 underline"
                                            >
                                                Resend code
                                            </button>
                                        </form>
                                    )}
                                </section>
                            ) : null}

                            {verified ? (
                                <form onSubmit={submitReturn} className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 md:p-6">
                                    <h2 className="text-sm font-black uppercase tracking-widest text-amber-950 mb-2">
                                        Why are you returning this order?
                                    </h2>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        rows={4}
                                        placeholder="e.g. Wrong variety delivered, unopened bag damaged in transit..."
                                        className="w-full rounded-xl border border-amber-200 bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-melagri-primary/20 focus:border-melagri-primary"
                                    />
                                    <button
                                        type="submit"
                                        disabled={busy !== null || reason.trim().length < 8}
                                        className="mt-4 w-full min-h-12 rounded-xl bg-melagri-primary text-white font-bold hover:bg-melagri-secondary disabled:opacity-60"
                                    >
                                        {busy === 'submit' ? 'Submitting...' : 'Submit return request'}
                                    </button>
                                </form>
                            ) : null}
                        </>
                    )}
                </div>
            ) : null}
        </OrderAccessFrame>
    );
}
