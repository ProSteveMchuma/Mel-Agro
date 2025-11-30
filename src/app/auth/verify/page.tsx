"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function VerifyPage() {
    const [status, setStatus] = useState('Verifying your login...');
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const verifyLogin = async () => {
            if (isSignInWithEmailLink(auth, window.location.href)) {
                let email = window.localStorage.getItem('emailForSignIn');

                if (!email) {
                    // User opened link on different device. Ask for email.
                    email = window.prompt('Please provide your email for confirmation');
                }

                if (email) {
                    try {
                        await signInWithEmailLink(auth, email, window.location.href);
                        window.localStorage.removeItem('emailForSignIn');
                        setStatus('Success! Redirecting...');
                        // Get callbackUrl from query params if passed in the link, or default to home
                        // Note: Firebase link might strip custom params, but we can try.
                        // Usually we redirect to dashboard or home.
                        setTimeout(() => router.push('/'), 1500);
                    } catch (error: any) {
                        console.error('Error signing in with email link', error);
                        setStatus(`Error: ${error.message}`);
                    }
                } else {
                    setStatus('Error: Email is required to verify login.');
                }
            } else {
                setStatus('Invalid login link.');
            }
        };

        verifyLogin();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Login Verification</h2>
                <p className={`text-lg ${status.startsWith('Error') ? 'text-red-600' : 'text-gray-600'}`}>
                    {status}
                </p>
                {status.startsWith('Success') && (
                    <div className="mt-4 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-melagro-primary"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
