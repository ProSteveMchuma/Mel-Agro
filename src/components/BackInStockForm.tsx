'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function BackInStockForm({
    productId,
    productName,
}: {
    productId: string;
    productName: string;
}) {
    const { user } = useAuth();
    const [phone, setPhone] = useState(user?.phone || '');
    const [honeypot, setHoneypot] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
            const token = await (await import('firebase/auth')).getAuth().currentUser?.getIdToken().catch(() => null);
            const res = await fetch('/api/stock-alerts/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    productId,
                    productName,
                    phone,
                    website: honeypot,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                toast.error(data.message || 'Could not save your request');
                return;
            }
            setDone(true);
            toast.success(data.message || 'We will notify you when it is back');
        } catch {
            toast.error('Could not save your request');
        } finally {
            setBusy(false);
        }
    };

    if (done) {
        return (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                You are on the waitlist. We will message {phone || 'your phone'} when this is back in stock.
            </div>
        );
    }

    return (
        <form onSubmit={(e) => void submit(e)} className="rounded-xl border border-amber-100 bg-amber-50/80 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-amber-900 mb-2">Notify me when available</p>
            <p className="text-xs text-amber-800 mb-3">
                Enter your M-Pesa number. We will send one SMS or WhatsApp when this product is restocked — no marketing list.
            </p>
            <label className="sr-only" htmlFor={`bis-${productId}`}>Phone number</label>
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    id={`bis-${productId}`}
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm font-medium"
                />
                {/* Honeypot */}
                <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="absolute -left-[9999px] h-0 w-0 opacity-0"
                    aria-hidden="true"
                />
                <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-amber-900 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-amber-800 disabled:opacity-60"
                >
                    {busy ? 'Saving…' : 'Notify me'}
                </button>
            </div>
        </form>
    );
}
