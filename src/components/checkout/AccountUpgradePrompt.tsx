"use client";

import { useEffect, useRef, useState } from 'react';
import { signInWithCustomToken } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { AccountUpgradeEvent } from '@/lib/account-upgrade';

interface AccountUpgradePromptProps {
    orderId: string;
    phone: string;
    name: string;
    onCompleted?: () => void;
}

type Step = 'offer' | 'otp' | 'complete';

export default function AccountUpgradePrompt({ orderId, phone, name, onCompleted }: AccountUpgradePromptProps) {
    const [step, setStep] = useState<Step>('offer');
    const [phoneInput, setPhoneInput] = useState(phone);
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dismissed, setDismissed] = useState(false);
    const guestTokenRef = useRef('');
    const dismissedKey = `melagri_account_prompt_dismissed:${orderId}`;

    const recordEvent = async (event: AccountUpgradeEvent) => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        await setDoc(doc(db, 'analytics_funnels', uid), {
            userId: uid,
            lastStep: event,
            timestamp: serverTimestamp(),
            steps: { [event]: serverTimestamp() },
        }, { merge: true }).catch(() => undefined);
    };

    useEffect(() => {
        if (sessionStorage.getItem(dismissedKey)) setDismissed(true);
        else void recordEvent('account_prompt_shown');
    }, [dismissedKey]);

    if (dismissed) return null;
    const showPrompt = Boolean(auth.currentUser?.isAnonymous || step === 'otp' || step === 'complete');
    if (!showPrompt) return null;

    const sendOtp = async () => {
        setLoading(true);
        setError('');
        try {
            const guest = auth.currentUser;
            if (!guest?.isAnonymous) throw new Error('This guest session has expired. Sign in to save your order.');
            guestTokenRef.current = await guest.getIdToken(true);
            const res = await fetch('/api/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phoneInput }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Unable to send the verification code');
            }
            setStep('otp');
            void recordEvent('account_prompt_accepted');
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Unable to send the verification code');
        } finally {
            setLoading(false);
        }
    };

    const verifyAndUpgrade = async () => {
        setLoading(true);
        setError('');
        try {
            const guest = auth.currentUser;
            if (!guest) throw new Error('This session has expired. Sign in to save your order.');
            if (!/^\d{6}$/.test(otp)) throw new Error('Enter the 6-digit verification code');
            if (guest.isAnonymous) {
                guestTokenRef.current = guestTokenRef.current || await guest.getIdToken(true);
            }

            const res = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phoneInput, code: otp }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.token) {
                throw new Error(data.message || 'That code is not correct. Check the SMS from Makamithi and try again.');
            }

            const guestToken = guestTokenRef.current || await guest.getIdToken(true);
            const signedIn = await signInWithCustomToken(auth, data.token);
            await setDoc(doc(db, 'users', signedIn.user.uid), {
                name: name || 'Farmer',
                phone: phoneInput,
                updatedAt: new Date().toISOString(),
            }, { merge: true });

            if (guestToken) {
                const targetToken = await signedIn.user.getIdToken(true);
                const claim = await fetch('/api/orders/claim', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${targetToken}`,
                    },
                    body: JSON.stringify({ guestToken, byPhone: true }),
                });
                const claimResult = await claim.json().catch(() => ({}));
                if (!claim.ok || !claimResult.success) {
                    throw new Error(claimResult.message || 'Unable to attach this order to your account');
                }
            }

            setStep('complete');
            void recordEvent('account_upgrade_completed');
            onCompleted?.();
        } catch (caught: any) {
            setError(caught?.message || 'Unable to create your account');
            void recordEvent('account_upgrade_failed');
        } finally {
            setLoading(false);
        }
    };

    const dismiss = () => {
        sessionStorage.setItem(dismissedKey, 'true');
        void recordEvent('account_prompt_declined');
        setDismissed(true);
    };

    if (step === 'complete') {
        return auth.currentUser?.isAnonymous ? null : (
            <section className="mb-8 rounded-3xl border border-green-200 bg-green-50 p-6 md:p-8" aria-live="polite">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-green-700">Account ready</p>
                <h2 className="mt-2 text-2xl font-black text-gray-900">Your order is saved to your account.</h2>
                <p className="mt-2 text-sm text-gray-600">You can now track delivery, download documents, and reorder without entering your details again.</p>
            </section>
        );
    }

    return (
        <section className="mb-8 overflow-hidden rounded-3xl border border-green-200 bg-gradient-to-br from-green-950 via-green-900 to-emerald-800 text-white shadow-xl shadow-green-950/10">
            <div className="grid gap-6 p-6 md:grid-cols-[1fr_0.85fr] md:p-8">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-green-300">One last useful step</p>
                    <h2 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">Create an account & track this order</h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-green-50/80">Keep your receipt, delivery updates, saved address, loyalty points, and faster reordering in one place.</p>
                    <ul className="mt-5 grid gap-2 text-sm text-green-50/90 sm:grid-cols-2">
                        <li>✓ Live delivery tracking</li>
                        <li>✓ Receipts and invoices</li>
                        <li>✓ Faster repeat orders</li>
                        <li>✓ Loyalty points</li>
                    </ul>
                </div>

                <div className="rounded-2xl bg-white p-5 text-gray-900 shadow-lg">
                    {step === 'offer' ? (
                        <>
                            <label htmlFor="upgrade-phone" className="text-xs font-black uppercase tracking-widest text-gray-500">M-Pesa phone number</label>
                            <input id="upgrade-phone" value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} inputMode="tel" autoComplete="tel" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-bold outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100" />
                            <button onClick={sendOtp} disabled={loading} className="mt-4 w-full rounded-xl bg-green-600 px-5 py-3.5 font-black text-white shadow-md transition hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:opacity-60">
                                {loading ? 'Sending code…' : 'Create account & track order'}
                            </button>
                            <button onClick={dismiss} disabled={loading} className="mt-3 w-full rounded-xl px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200">Not now</button>
                        </>
                    ) : (
                        <>
                            <label htmlFor="upgrade-otp" className="text-xs font-black uppercase tracking-widest text-gray-500">Verification code</label>
                            <p className="mt-1 text-xs text-gray-500">Enter the 6-digit SMS from Makamithi sent to {phoneInput}.</p>
                            <input id="upgrade-otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 text-center font-mono text-xl font-black tracking-[0.35em] outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100" />
                            <button onClick={verifyAndUpgrade} disabled={loading || otp.length !== 6} className="mt-4 w-full rounded-xl bg-green-600 px-5 py-3.5 font-black text-white transition hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:opacity-60">
                                {loading ? 'Securing account…' : 'Verify & save order'}
                            </button>
                            <button onClick={() => { setStep('offer'); setOtp(''); setError(''); }} disabled={loading} className="mt-3 w-full rounded-xl px-5 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50">Change number</button>
                        </>
                    )}
                    {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
                    <p className="mt-3 text-[10px] leading-4 text-gray-400">Creating an account is optional. We use your phone only to save and recover this order — not for marketing.</p>
                </div>
            </div>
        </section>
    );
}
