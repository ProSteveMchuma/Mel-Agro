"use client";

import { useEffect, useMemo, useState } from "react";
import {
    GoogleAuthProvider,
    linkWithPopup,
    reload,
    sendEmailVerification,
    verifyBeforeUpdateEmail,
    type User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { auth, db } from "@/lib/firebase";

type Step = "idle" | "phone" | "otp" | "email";

function providerSet(user: FirebaseUser | null) {
    const ids = new Set((user?.providerData || []).map((p) => p.providerId));
    // Custom-token phone users may have phoneNumber without a phone provider entry
    if (user?.phoneNumber) ids.add("phone");
    return ids;
}

export default function AccountLinkPanel({ highlightPhone = false }: { highlightPhone?: boolean }) {
    const [fbUser, setFbUser] = useState<FirebaseUser | null>(auth.currentUser);
    const [step, setStep] = useState<Step>(highlightPhone ? "phone" : "idle");
    const [phone, setPhone] = useState("");
    const [otp, setOtp] = useState("");
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        return auth.onAuthStateChanged((user) => setFbUser(user));
    }, []);

    const providers = useMemo(() => providerSet(fbUser), [fbUser]);
    const hasPhone = providers.has("phone") || Boolean(fbUser?.phoneNumber);
    const hasGoogle = providers.has("google.com");
    const hasEmail = Boolean(fbUser?.email);

    if (!fbUser || fbUser.isAnonymous) return null;

    const refreshUser = async () => {
        await reload(fbUser);
        setFbUser(auth.currentUser);
    };

    const connectGoogle = async () => {
        setBusy(true);
        setMessage("");
        try {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });
            const linked = await linkWithPopup(fbUser, provider);
            const emailAddr = (linked.user.email || "").trim().toLowerCase();
            await setDoc(doc(db, "users", linked.user.uid), {
                email: emailAddr || null,
                name: linked.user.displayName || undefined,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            await refreshUser();
            toast.success("Google connected to this account");
            setStep("idle");
        } catch (err: any) {
            const code = err?.code as string | undefined;
            if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
                setMessage(
                    "That Google account is already used on another Mel-Agri login. Sign in with Google, then add this phone from Account → Sign-in methods so we can keep one profile.",
                );
            } else if (code === "auth/popup-blocked") {
                setMessage("Allow popups for Mel-Agri, then try Connect Google again.");
            } else if (code === "auth/popup-closed-by-user") {
                setMessage("Google window was closed before finishing.");
            } else {
                setMessage(err?.message || "Could not connect Google.");
            }
        } finally {
            setBusy(false);
        }
    };

    const sendPhoneOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
            const res = await fetch("/api/auth/otp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) throw new Error(data.message || "Could not send code.");
            setStep("otp");
            setOtp("");
            toast.success("Code sent");
        } catch (err: any) {
            setMessage(err?.message || "Could not send code.");
        } finally {
            setBusy(false);
        }
    };

    const confirmPhoneLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
            const idToken = await fbUser.getIdToken();
            const res = await fetch("/api/auth/link/phone", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ phone, code: otp }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                setMessage(data.message || "Could not link phone.");
                return;
            }
            await refreshUser();
            await fbUser.getIdToken(true);
            toast.success("Phone linked — future logins stay on one account");
            setStep("idle");
            setPhone("");
            setOtp("");
        } catch (err: any) {
            setMessage(err?.message || "Could not link phone.");
        } finally {
            setBusy(false);
        }
    };

    const startEmailLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
            const trimmed = email.trim().toLowerCase();
            if (!trimmed.includes("@")) throw new Error("Enter a valid email address.");
            await verifyBeforeUpdateEmail(fbUser, trimmed);
            toast.success("Check your inbox to confirm this email");
            setMessage(`We sent a confirmation link to ${trimmed}. After you open it, this email stays on the same account.`);
            setStep("idle");
        } catch (err: any) {
            const code = err?.code as string | undefined;
            if (code === "auth/email-already-in-use") {
                setMessage("That email is already used on another Mel-Agri account. Sign in there, or use a different email.");
            } else if (code === "auth/requires-recent-login") {
                setMessage("For security, sign out and sign in again, then retry adding email.");
            } else {
                setMessage(err?.message || "Could not start email verification.");
            }
        } finally {
            setBusy(false);
        }
    };

    const resendEmailVerification = async () => {
        if (!fbUser.email) return;
        setBusy(true);
        try {
            await sendEmailVerification(fbUser);
            toast.success("Verification email sent");
        } catch (err: any) {
            setMessage(err?.message || "Could not resend verification.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-gray-950">Sign-in methods</h3>
            <p className="mt-1 text-sm text-gray-500">
                Connect phone, Google, and email to the <strong className="font-semibold text-gray-700">same</strong> account so orders and points stay together.
            </p>

            <ul className="mt-5 space-y-3">
                <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Phone</p>
                        <p className="text-xs text-gray-500">{hasPhone ? fbUser.phoneNumber : "Not connected"}</p>
                    </div>
                    {!hasPhone && step === "idle" && (
                        <button type="button" onClick={() => setStep("phone")} className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-black text-white">
                            Add phone
                        </button>
                    )}
                    {hasPhone && <span className="text-[10px] font-black uppercase tracking-wider text-green-700">Connected</span>}
                </li>

                <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Google</p>
                        <p className="text-xs text-gray-500">{hasGoogle ? (fbUser.email || "Connected") : "Not connected"}</p>
                    </div>
                    {!hasGoogle ? (
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => void connectGoogle()}
                            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-black text-gray-800 disabled:opacity-50"
                        >
                            {busy ? "Connecting…" : "Connect Google"}
                        </button>
                    ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider text-green-700">Connected</span>
                    )}
                </li>

                <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div>
                        <p className="text-sm font-bold text-gray-900">Email</p>
                        <p className="text-xs text-gray-500">
                            {hasEmail ? fbUser.email : "Not connected"}
                            {hasEmail && !fbUser.emailVerified ? " · not verified yet" : ""}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {hasEmail && !fbUser.emailVerified && (
                            <button type="button" disabled={busy} onClick={() => void resendEmailVerification()} className="rounded-xl border px-3 py-2 text-xs font-bold">
                                Resend verify
                            </button>
                        )}
                        {!hasEmail && step === "idle" && (
                            <button type="button" onClick={() => setStep("email")} className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-black text-white">
                                Add email
                            </button>
                        )}
                        {hasEmail && fbUser.emailVerified && (
                            <span className="text-[10px] font-black uppercase tracking-wider text-green-700">Connected</span>
                        )}
                    </div>
                </li>
            </ul>

            {step === "phone" && (
                <form onSubmit={sendPhoneOtp} className="mt-5 space-y-3 rounded-xl border border-green-100 bg-green-50/50 p-4">
                    <p className="text-sm font-bold text-gray-900">Add phone to this account</p>
                    <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="07… or +254…"
                        className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setStep("idle")} className="rounded-xl border px-4 py-2 text-xs font-bold">
                            Cancel
                        </button>
                        <button type="submit" disabled={busy} className="rounded-xl bg-green-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                            {busy ? "Sending…" : "Send code"}
                        </button>
                    </div>
                </form>
            )}

            {step === "otp" && (
                <form onSubmit={confirmPhoneLink} className="mt-5 space-y-3 rounded-xl border border-green-100 bg-green-50/50 p-4">
                    <p className="text-sm font-bold text-gray-900">Enter the SMS code for {phone}</p>
                    <input
                        type="text"
                        inputMode="numeric"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-center font-mono text-lg tracking-[0.4em]"
                        placeholder="000000"
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setStep("phone")} className="rounded-xl border px-4 py-2 text-xs font-bold">
                            Change number
                        </button>
                        <button type="submit" disabled={busy || otp.length !== 6} className="rounded-xl bg-green-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                            {busy ? "Linking…" : "Confirm & link"}
                        </button>
                    </div>
                </form>
            )}

            {step === "email" && (
                <form onSubmit={startEmailLink} className="mt-5 space-y-3 rounded-xl border border-green-100 bg-green-50/50 p-4">
                    <p className="text-sm font-bold text-gray-900">Add email to this account</p>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setStep("idle")} className="rounded-xl border px-4 py-2 text-xs font-bold">
                            Cancel
                        </button>
                        <button type="submit" disabled={busy} className="rounded-xl bg-green-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
                            {busy ? "Sending…" : "Send confirmation"}
                        </button>
                    </div>
                </form>
            )}

            {message && (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</p>
            )}
        </section>
    );
}
