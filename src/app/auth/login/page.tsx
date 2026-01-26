"use client";

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Logo from '@/components/Logo';
import { sendSignInLinkToEmail, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function LoginForm() {
    const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [linkSent, setLinkSent] = useState(false);
    const [otpSent, setOtpSent] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/';

    // Initialize Recaptcha
    useEffect(() => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': (response: any) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                },
                'expired-callback': () => {
                    // Response expired. Ask user to solve reCAPTCHA again.
                }
            });
        }
    }, []);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!phone) {
            setError("Please enter a phone number");
            setIsLoading(false);
            return;
        }

        // Simple formatting
        let formattedPhone = phone;
        if (phone.startsWith('0')) formattedPhone = '+254' + phone.substring(1);
        if (phone.startsWith('7')) formattedPhone = '+254' + phone;

        try {
            const appVerifier = window.recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(confirmation);
            setOtpSent(true);
        } catch (err: any) {
            console.error("Phone Auth Error:", err);
            setError(err.message || 'Failed to send code. Please try again.');
            // Reset captcha if needed
            if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (!otp || !confirmationResult) return;

        try {
            await confirmationResult.confirm(otp);
            router.push(callbackUrl);
        } catch (err: any) {
            console.error("OTP Verify Error:", err);
            setError("Invalid verification code.");
        } finally {
            setIsLoading(false);
        }
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
            setLinkSent(true);
        } catch (err: any) {
            console.error("Magic Link error:", err);
            setError(err.message || 'Failed to send login link. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            router.push(callbackUrl);
        } catch (err: any) {
            console.error("Google login error:", err);
            setError(err.message || 'Failed to sign in with Google.');
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
                            Welcome Back
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Sign in to your Mel-Agri account
                        </p>
                    </div>

                    {/* Method Switcher */}
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

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                            <div className="flex">
                                <p className="text-sm text-red-700 ml-3">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Phone Login Form */}
                    {loginMethod === 'phone' && (
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
                                    <div id="recaptcha-container"></div>
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
                                        <p className="text-sm text-gray-600">Enter the code sent to <strong>{phone}</strong></p>
                                        <button type="button" onClick={() => setOtpSent(false)} className="text-xs text-melagri-primary underline mt-1">Change Number</button>
                                    </div>
                                    <div>
                                        <label htmlFor="otp" className="sr-only">Verification Code</label>
                                        <input
                                            id="otp"
                                            name="otp"
                                            type="text"
                                            required
                                            maxLength={6}
                                            className="text-center tracking-[1em] font-mono text-xl appearance-none rounded-lg block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 focus:outline-none focus:ring-melagri-primary focus:border-melagri-primary"
                                            placeholder="000000"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-melagri-primary hover:bg-melagri-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-melagri-primary transition-all disabled:opacity-70`}
                                    >
                                        {isLoading ? 'Verifying...' : 'Verify & Login'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Email Login Form */}
                    {loginMethod === 'email' && (
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
                            <div className="relative mt-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500 uppercase tracking-wider text-xs font-semibold">Or continue with</span></div>
                            </div>
                            <div className="mt-6 grid grid-cols-1 gap-3">
                                <button onClick={handleGoogleLogin} className="w-full inline-flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                    Continue with Google
                                </button>
                            </div>
                        </>
                    )}

                    <div className="mt-6 text-center text-xs text-gray-500">
                        By continuing, you agree to our <a href="#" className="underline hover:text-gray-900">Terms of Service</a> and <a href="#" className="underline hover:text-gray-900">Privacy Policy</a>.
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}

// Add types for window object
declare global {
    interface Window {
        recaptchaVerifier: any;
    }
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
