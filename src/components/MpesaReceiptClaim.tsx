"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";
import { toast } from "react-hot-toast";

export default function MpesaReceiptClaim({
    orderId,
    defaultCode = "",
    disabled = false,
    onPaid,
    onPending,
}: {
    orderId: string;
    defaultCode?: string;
    disabled?: boolean;
    onPaid?: () => void;
    onPending?: (code: string) => void;
}) {
    const [code, setCode] = useState(defaultCode);
    const [submitting, setSubmitting] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        const transactionCode = code.trim();
        if (!transactionCode) {
            toast.error("Enter the M-Pesa transaction code from your SMS");
            return;
        }

        setSubmitting(true);
        const loading = toast.loading("Checking your M-Pesa code...");
        try {
            const token = await getAuth().currentUser?.getIdToken();
            const res = await fetch("/api/payment/mpesa/claim-receipt", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ orderId, transactionCode }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                toast.error(data.message || "Could not verify that code", { id: loading });
                return;
            }
            if (data.paid) {
                toast.success(data.message || "Payment confirmed", { id: loading });
                onPaid?.();
            } else {
                toast.success(data.message || "Code submitted for verification", { id: loading, duration: 6000 });
                onPending?.(transactionCode);
            }
        } catch (error: any) {
            toast.error(error?.message || "Could not submit the code", { id: loading });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={submit} className="mt-4 pt-4 border-t border-amber-200/80">
            <label htmlFor={`mpesa-code-${orderId}`} className="block text-xs font-black uppercase tracking-widest text-amber-900">
                Already paid? Enter your M-Pesa code
            </label>
            <p className="text-[11px] text-amber-800 mt-1 mb-2">
                Use the code in your M-Pesa SMS (for example TJK7H8K9L0). Do not send another STK if money already left your phone.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    id={`mpesa-code-${orderId}`}
                    type="text"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="e.g. TJK7H8K9L0"
                    value={code}
                    disabled={disabled || submitting}
                    onChange={(event) => setCode(event.target.value.toUpperCase())}
                    className="flex-1 min-h-11 px-3 rounded-lg border border-amber-200 bg-white font-mono text-sm tracking-widest uppercase outline-none focus:ring-2 focus:ring-melagri-primary/20 focus:border-melagri-primary disabled:opacity-60"
                />
                <button
                    type="submit"
                    disabled={disabled || submitting || !code.trim()}
                    className="min-h-11 px-4 py-2 bg-white border border-amber-300 text-amber-950 text-xs font-bold rounded-lg hover:bg-amber-100 transition-all disabled:opacity-60"
                >
                    {submitting ? "Checking..." : "Confirm with code"}
                </button>
            </div>
        </form>
    );
}
