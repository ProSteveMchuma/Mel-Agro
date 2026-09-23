"use client";

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';
import {
    sendSignInLinkToEmail,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    linkWithPopup,
    signInWithCustomToken,
    updateProfile,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

// Role assignment for new users happens inside AuthContext.onAuthStateChanged on
// the initial CREATE — not here. Firestore rules forbid the user from updating
// their own role / status / loyaltyPoints fields (firestore.rules:60), so any
// merge-update from this page must skip those.

const getErrorMessage = (error: any) => {
    const code = error?.code as string;
    switch (code) {
        case 'auth/invalid-phone-number':
            return 'The phone number is invalid. Please check the format.';
        case 'auth/missing-phone-number':
            return 'Phone number is required.';
        case 'auth/quota-exceeded':
            return 'SMS quota exceeded. Please try again later.';
        case 'auth/too-many-requests':
            return 'Too many requests. Please wait a moment and try again.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Contact support.';
        case 'auth/operation-not-allowed':
            return 'This sign-in method is not enabled. Enable Google in Firebase Authentication → Sign-in method, then try again.';
        case 'auth/unauthorized-domain':
            return 'This website domain is not authorized for Google sign-in. Add it under Firebase Authentication → Settings → Authorized domains.';
        case 'auth/popup-blocked':
            return 'Your browser blocked the Google sign-in window. Allow popups for Mel-Agri, or we will try a full-page redirect.';
        case 'auth/popup-closed-by-user':
            return 'Google sign-in was closed before finishing. Please try again.';
        case 'auth/cancelled-popup-request':
            return 'Another sign-in window was already open. Please try Google again.';
        case 'auth/account-exists-with-different-credential':
            return 'An account already exists with this email using a different sign-in method. Try phone or email magic link, or use the same Google account you used before.';
        case 'auth/network-request-failed':
            return 'Network error during Google sign-in. Check your connection and try again.';
        case 'auth/captcha-check-failed':
            return 'ReCAPTCHA check failed. Please refresh and try again.';
        case 'auth/invalid-verification-code':
            return 'Invalid OTP code. Please check and try again.';
        case 'auth/code-expired':
            return 'The OTP code has expired. Please request a new one.';
        default:
            return error?.message || 'An unexpected error occurred. Please try again.';
    }
};

function shouldFallbackToRedirect(code: string | undefined) {
    return code === 'auth/popup-blocked'
        || code === 'auth/cancelled-popup-request';
}

async function mergeGoogleProfile(uid: string, displayName: string | null, email: string | null) {
    const trimmedEmail = (email || '').trim().toLowerCase();
    await setDoc(doc(db, 'users', uid), {
        name: displayName || (trimmedEmail ? trimmedEmail.split('@')[0] : 'User'),
        email: trimmedEmail || null,
        updatedAt: new Date().toISOString(),
    }, { merge: true });
}

function LoginForm() {
    const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [linkSent, setLinkSent] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [needsName, setNeedsName] = useState(false);
    const [nameInput, setNameInput] = useState('');
    const [googleBusy, setGoogleBusy] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';

    // Complete Google redirect flow (mobile / popup-blocked fallback)
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await getRedirectResult(auth);
                if (cancelled || !result?.user) return;
                setGoogleBusy(true);
                try {
                    await mergeGoogleProfile(result.user.uid, result.user.displayName, result.user.email);
                } catch (profileErr) {
                    console.warn('Google profile merge after redirect failed (non-fatal):', profileErr);
                }
                const stored = window.localStorage.getItem('postLoginRedirect');
                if (stored) window.localStorage.removeItem('postLoginRedirect');
                if (!result.user.phoneNumber) {
                    router.push('/dashboard/user?tab=profile&linkPhone=1');
                } else {
                    router.push(stored || callbackUrl);
                }
            } catch (err: any) {
                if (!cancelled) {
                    console.error('Google redirect result error:', err);
                    setError(getErrorMessage(err));
                }
            } finally {
                if (!cancelled) setGoogleBusy(false);
            }
        })();
        return () => { cancelled = true; };
    }, [callbackUrl, router]);

    const handleSendOtp = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setIsLoading(true);
        setError('');

        if (!phone) {
            setError("Please enter a phone number");
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Could not send the verification code.');
            }
            setOtpSent(true);
            setOtp('');
        } catch (err: any) {
            console.error("Phone Auth Error:", err);
            setError(err?.message || 'Could not send the verification code.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!otp) {
            setError('Enter the 6-digit code from your SMS.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code: otp }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.token) {
                throw new Error(data.message || 'Invalid OTP code. Please check and try again.');
            }
            const cred = await signInWithCustomToken(auth, data.token);
            const fbUser = cred.user;
            const dn = (fbUser.displayName || '').trim();
            if (!dn || dn === 'User') {
                setNeedsName(true);
                setIsLoading(false);
                return;
            }
            router.push(callbackUrl);
        } catch (err: any) {
            console.error("OTP Verify Error:", err);
            setError(getErrorMessage(err));
            setIsLoading(false);
        }
    };

    const handleSaveName = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = nameInput.trim().replace(/\s+/g, ' ');
        if (trimmed.length < 2) {
            setError('Please enter your name (at least 2 characters)');
            return;
        }
        if (trimmed.length > 80) {
            setError('Name is too long. Please use 80 characters or fewer.');
            return;
        }
        const fbUser = auth.currentUser;
        if (!fbUser) {
            setError('Session expired. Please try again.');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await updateProfile(fbUser, { displayName: trimmed });

            await setDoc(doc(db, 'users', fbUser.uid), {
                name: trimmed,
                phone: fbUser.phoneNumber || phone || null,
                email: fbUser.email || null,
                updatedAt: new Date().toISOString(),
            }, { merge: true });

            router.push(callbackUrl);
        } catch (err: any) {
            console.error('Save name error:', err);
            setError(err?.message || 'Could not save your name. Please try again.');
            setIsLoading(false);
        }
    };

    const handleSkipName = () => {
        router.push(callbackUrl);
    };

    const handleMagicLinkLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const actionCodeSettings = {
            url: `${window.location.origin}/auth/verify?callbackUrl=${encodeURIComponent(callbackUrl)}`,
            handleCodeInApp: true,
        };

        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            if (callbackUrl && callbackUrl !== '/') {
                window.localStorage.setItem('postLoginRedirect', callbackUrl);
            }
            setLinkSent(true);
        } catch (err: any) {
            console.error("Magic Link error:", err);
            setError(getErrorMessage(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setGoogleBusy(true);
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        const finish = async (uid: string, displayName: string | null, email: string | null, phoneNumber?: string | null) => {
            // Profile merge is best-effort — Auth already succeeded; AuthContext creates the user doc.
            try {
                await mergeGoogleProfile(uid, displayName, email);
            } catch (profileErr) {
                console.warn('Google profile merge failed (non-fatal):', profileErr);
            }
            // New Google accounts without a phone → prompt to link phone (prevents a later phone duplicate).
            if (!phoneNumber) {
                router.push('/dashboard/user?tab=profile&linkPhone=1');
                return;
            }
            router.push(callbackUrl);
        };

        try {
            const current = auth.currentUser;

            // Preserve guest cart/orders: cache anonymous token, then try linking Google to the same UID.
            if (current?.isAnonymous) {
                try {
                    const guestToken = await current.getIdToken();
                    sessionStorage.setItem('melagri_guest_id_token', guestToken);
                    const linked = await linkWithPopup(current, provider);
                    await finish(linked.user.uid, linked.user.displayName, linked.user.email, linked.user.phoneNumber);
                    return;
                } catch (linkErr: any) {
                    const linkCode = linkErr?.code as string | undefined;
                    if (linkCode === 'auth/credential-already-in-use' || linkCode === 'auth/email-already-in-use') {
                        const cred = await signInWithPopup(auth, provider);
                        await finish(cred.user.uid, cred.user.displayName, cred.user.email, cred.user.phoneNumber);
                        return;
                    }
                    if (shouldFallbackToRedirect(linkCode)) {
                        window.localStorage.setItem('postLoginRedirect', callbackUrl);
                        await signInWithRedirect(auth, provider);
                        return;
                    }
                    throw linkErr;
                }
            }

            // Already signed in (e.g. phone OTP): attach Google to THIS uid instead of creating another.
            if (current && !current.isAnonymous) {
                const hasGoogle = current.providerData.some((p) => p.providerId === 'google.com');
                if (!hasGoogle) {
                    try {
                        const linked = await linkWithPopup(current, provider);
                        await finish(linked.user.uid, linked.user.displayName, linked.user.email, linked.user.phoneNumber);
                        return;
                    } catch (linkErr: any) {
                        const linkCode = linkErr?.code as string | undefined;
                        if (linkCode === 'auth/credential-already-in-use' || linkCode === 'auth/email-already-in-use') {
                            setError(
                                'That Google account is already tied to another Mel-Agri login. Sign out, sign in with Google, then add this phone under Account → Sign-in methods.',
                            );
                            setGoogleBusy(false);
                            return;
                        }
                        throw linkErr;
                    }
                }
            }

            try {
                const cred = await signInWithPopup(auth, provider);
                await finish(cred.user.uid, cred.user.displayName, cred.user.email, cred.user.phoneNumber);
            } catch (popupErr: any) {
                if (shouldFallbackToRedirect(popupErr?.code)) {
                    window.localStorage.setItem('postLoginRedirect', callbackUrl);
                    await signInWithRedirect(auth, provider);
                    return;
                }
                throw popupErr;
            }
        } catch (err: any) {
            console.error("Google login error:", err);
            setError(getErrorMessage(err));
            setGoogleBusy(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />
            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <Logo />
                        </div>
                        <h2 className="mt-2 text-3xl font-extrabold text-gray-900 tracking-tight">
                            Welcome to Mel-Agri
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Sign in or create your account in seconds — no separate signup needed.
                        </p>
                    </div>

                    {!needsName && (
                        <div className="flex border-b border-gray-200">
                            <button
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${loginMethod === 'phone' ? 'border-melagri-primary text-melagri-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => { setLoginMethod('phone'); setError(''); setOtpSent(false); }}
                            >
                                Phone Number
                            </button>
                            <button
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${loginMethod === 'email' ? 'border-melagri-primary text-melagri-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                onClick={() => { setLoginMethod('email'); setError(''); setLinkSent(false); }}
                            >
                                Email Address
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                            <div className="flex">
                                <p className="text-sm text-red-700 ml-3">{error}</p>
                            </div>
                        </div>
                    )}

                    {needsName ? (
                        <form onSubmit={handleSaveName} className="mt-6 space-y-6">
                            <div className="text-center">
                                <div className="inline-flex w-14 h-14 bg-melagri-primary/10 text-melagri-primary rounded-2xl items-center justify-center text-2xl mb-3">👋</div>
                                <h3 className="text-lg font-bold text-gray-900">One last thing — what should we call you?</h3>
                                <p className="text-xs text-gray-500 mt-1">We&apos;ll use this on receipts, support chats, and order updates.</p>
                            </div>
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full name</label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    autoFocus
                                    required
                                    minLength={2}
                                    maxLength={80}
                                    className="mt-1 appearance-none rounded-lg block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-melagri-primary focus:border-melagri-primary sm:text-sm"
                                    placeholder="e.g. Wanjiku Mwangi"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || nameInput.trim().length < 2}
                                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-melagri-primary hover:bg-melagri-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-melagri-primary transition-all disabled:opacity-70"
                            >
                                {isLoading ? 'Saving...' : 'Save & Continue'}
                            </button>
                            <button
                                type="button"
                                onClick={handleSkipName}
                                className="w-full text-xs text-gray-400 hover:text-gray-600 underline"
                            >
                                Skip for now
                            </button>
                        </form>
                    ) : null}

                    {!needsName && loginMethod === 'phone' && (
                        <div className="mt-6 space-y-6">
                            {!otpSent ? (
                                <form onSubmit={handleSendOtp} className="space-y-6">
                                    <div>
                                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                                        <input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            required
                                            className="mt-1 appearance-none rounded-lg block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-melagri-primary focus:border-melagri-primary sm:text-sm"
                                            placeholder="07..."
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-melagri-primary hover:bg-melagri-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-melagri-primary transition-all disabled:opacity-70`}
                                    >
                                        {isLoading ? 'Sending Code...' : 'Send Verification Code'}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-6">
                                    <div className="text-center mb-4">
                                        <p className="text-sm text-gray-600">Enter the 6-digit code sent from <strong>Makamithi</strong> to <strong>{phone}</strong></p>
                                        <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(''); }} className="text-xs text-melagri-primary underline mt-1">Change Number</button>
                                    </div>
                                    <div>
                                        <label htmlFor="otp" className="sr-only">Verification Code</label>
                                        <input
                                            id="otp"
                                            name="otp"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            required
                                            maxLength={6}
                                            className="text-center tracking-[0.35em] sm:tracking-[1em] font-mono text-lg sm:text-xl appearance-none rounded-lg block w-full px-3 sm:px-4 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-melagri-primary focus:border-melagri-primary"
                                            placeholder="000000"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading || otp.length !== 6}
                                        className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-melagri-primary hover:bg-melagri-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-melagri-primary transition-all disabled:opacity-70`}
                                    >
                                        {isLoading ? 'Verifying...' : 'Verify & Login'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleSendOtp()}
                                        disabled={isLoading}
                                        className="w-full text-xs text-gray-500 hover:text-gray-700"
                                    >
                                        Resend code
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {!needsName && loginMethod === 'email' && (
                        <>
                            {linkSent ? (
                                <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-md text-center">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">Check your email</h3>
                                    <p className="mt-2 text-sm text-gray-500">We sent a magic link to <strong>{email}</strong>.</p>
                                    <button onClick={() => setLinkSent(false)} className="mt-4 text-sm font-medium text-melagri-primary hover:text-melagri-secondary">Try a different email</button>
                                </div>
                            ) : (
                                <form className="mt-6 space-y-6" onSubmit={handleMagicLinkLogin}>
                                    <div>
                                        <label htmlFor="email-address" className="sr-only">Email address</label>
                                        <input
                                            id="email-address"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            className="appearance-none rounded-lg block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-melagri-primary focus:border-melagri-primary sm:text-sm"
                                            placeholder="Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-gray-900 bg-white border-gray-300 hover:bg-gray-50 shadow-sm disabled:opacity-70">
                                        {isLoading ? 'Sending Link...' : 'Continue with Email'}
                                    </button>
                                </form>
                            )}
                        </>
                    )}

                    {/* Google — always visible on phone and email tabs */}
                    {!needsName && (
                        <div className="mt-6 space-y-4">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500 uppercase tracking-wider text-xs font-semibold">Or continue with</span></div>
                            </div>
                            <button
                                type="button"
                                onClick={() => void handleGoogleLogin()}
                                disabled={googleBusy || isLoading}
                                className="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-70"
                            >
                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                {googleBusy ? 'Connecting to Google…' : 'Continue with Google'}
                            </button>
                        </div>
                    )}

                    <div className="mt-6 text-center text-xs text-gray-500">
                        By continuing, you agree to our <a href="/terms" className="underline hover:text-gray-900">Terms of Service</a> and <a href="/privacy" className="underline hover:text-gray-900">Privacy Policy</a>.
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
