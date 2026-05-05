"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const ADMIN_EMAILS = new Set([
    'proinnovationtech@gmail.com',
    'admin@melagri.com',
    'admin@melagri.co.ke',
    'james.wambua@makamithi.com',
    'shadrack@adifa.co.ke',
]);

const friendlyAuthError = (err: any): string => {
    const code = err?.code as string | undefined;
    switch (code) {
        case 'auth/email-already-in-use': return 'An account with this email already exists. Try signing in instead.';
        case 'auth/invalid-email': return 'That email address looks invalid. Please double-check.';
        case 'auth/weak-password': return 'Password is too weak. Use at least 6 characters.';
        case 'auth/network-request-failed': return 'Network error. Check your connection and try again.';
        case 'auth/operation-not-allowed': return 'Email signup is currently disabled. Try Google or phone instead.';
        case 'auth/popup-closed-by-user': return 'Sign-in window was closed before finishing.';
        case 'auth/popup-blocked': return 'Your browser blocked the sign-in popup. Please allow popups and try again.';
        default: return err?.message || 'Failed to create account. Please try again.';
    }
};

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const trimmedName = name.trim().replace(/\s+/g, ' ');
        const trimmedEmail = email.trim().toLowerCase();

        if (trimmedName.length < 2) {
            setError('Please enter your full name (at least 2 characters).');
            return;
        }
        if (trimmedName.length > 80) {
            setError('Name is too long. Please use 80 characters or fewer.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
            const fbUser = userCredential.user;

            // Set Auth displayName so any future onAuthStateChanged fires with the correct name.
            await updateProfile(fbUser, { displayName: trimmedName });

            // Write the user doc directly. AuthContext's onAuthStateChanged may have already
            // created a stub with name='User' — merge:true lets us overwrite it with the real
            // name without clobbering anything else (e.g. role). Without this step, the user
            // sees "User" on the dashboard until they sign out and back in.
            const role = ADMIN_EMAILS.has(trimmedEmail)
                ? (trimmedEmail === 'proinnovationtech@gmail.com' ? 'super-admin' : 'admin')
                : 'user';
            await setDoc(doc(db, 'users', fbUser.uid), {
                name: trimmedName,
                email: trimmedEmail,
                role,
                createdAt: new Date().toISOString(),
                loyaltyPoints: 0,
            }, { merge: true });

            router.push('/dashboard/user');
        } catch (err: any) {
            console.error("Signup error:", err);
            setError(friendlyAuthError(err));
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const cred = await signInWithPopup(auth, provider);
            const fbUser = cred.user;

            // Mirror the email-signup behavior — explicitly write the Firestore doc so the
            // user's Google name and email show up on first paint, not after a re-login.
            const trimmedEmail = (fbUser.email || '').trim().toLowerCase();
            const role = ADMIN_EMAILS.has(trimmedEmail)
                ? (trimmedEmail === 'proinnovationtech@gmail.com' ? 'super-admin' : 'admin')
                : 'user';
            await setDoc(doc(db, 'users', fbUser.uid), {
                name: fbUser.displayName || trimmedEmail.split('@')[0] || 'User',
                email: trimmedEmail,
                role,
                createdAt: new Date().toISOString(),
                loyaltyPoints: 0,
            }, { merge: true });

            router.push('/dashboard/user');
        } catch (err: any) {
            console.error("Google login error:", err);
            setError(friendlyAuthError(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
                    <div className="text-center">
                        <h2 className="mt-6 text-3xl font-extrabold text-gray-900 tracking-tight">
                            Create Account
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Join Mel-Agri for a premium shopping experience
                        </p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    className="appearance-none rounded-lg block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-melagri-primary focus:border-melagri-primary sm:text-sm transition-all"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="appearance-none rounded-lg block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-melagri-primary focus:border-melagri-primary sm:text-sm transition-all"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        required
                                        minLength={6}
                                        className="appearance-none rounded-lg block w-full px-4 py-3 pr-12 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-melagri-primary focus:border-melagri-primary sm:text-sm transition-all"
                                        placeholder="Create a password (min 6 chars)"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(s => !s)}
                                        className="absolute inset-y-0 right-0 px-3 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-melagri-primary"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-melagri-primary hover:bg-melagri-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-melagri-primary transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? (
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : null}
                                {isLoading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </div>

                        <div className="flex items-center justify-center">
                            <div className="text-sm">
                                <Link href="/auth/login" className="font-medium text-gray-600 hover:text-melagri-primary">
                                    Already have an account? Sign in
                                </Link>
                            </div>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-3">
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full inline-flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.53-6.033-5.652s2.701-5.652 6.033-5.652c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.79-1.677-4.184-2.7-6.735-2.7-5.522 0-10 4.478-10 10s4.478 10 10 10c8.365 0 10.018-6.248 10.018-10 0-0.285-0.029-0.568-0.084-0.842h-10.017z" />
                                </svg>
                                <span className="ml-2">Google</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
