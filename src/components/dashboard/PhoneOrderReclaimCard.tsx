'use client';

import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { toast } from 'react-hot-toast';

export default function PhoneOrderReclaimCard({ phone }: { phone: string }) {
    const [busy, setBusy] = useState(false);
    const [doneMessage, setDoneMessage] = useState('');

    const reclaim = async () => {
        setBusy(true);
        const notice = toast.loading('Looking for guest orders on this phone...');
        try {
            const token = await getAuth().currentUser?.getIdToken();
            if (!token) throw new Error('Sign in again to continue');
            const res = await fetch('/api/orders/claim', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ byPhone: true }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Could not attach guest orders');
            }
            const message = data.message || 'Done';
            setDoneMessage(message);
            toast.success(message, { id: notice });
            if (Number(data.count) > 0) {
                window.setTimeout(() => window.location.reload(), 1200);
            }
        } catch (error: any) {
            toast.error(error?.message || 'Could not attach guest orders', { id: notice });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 md:p-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-900">Recover guest orders</h3>
            <p className="mt-2 text-sm text-emerald-900/80">
                Ordered earlier without signing in? We can attach past guest orders that used {phone} to this account.
            </p>
            {doneMessage ? (
                <p className="mt-3 text-sm font-semibold text-emerald-800">{doneMessage}</p>
            ) : (
                <button
                    type="button"
                    disabled={busy}
                    onClick={reclaim}
                    className="mt-4 min-h-11 rounded-xl bg-melagri-primary px-5 text-xs font-black uppercase tracking-wider text-white hover:bg-melagri-secondary disabled:opacity-60"
                >
                    {busy ? 'Searching...' : 'Attach guest orders'}
                </button>
            )}
        </div>
    );
}
