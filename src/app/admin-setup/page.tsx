"use client";
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function AdminSetupPage() {
    const { user, isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const router = useRouter();

    const handleMakeAdmin = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const userRef = doc(db, 'users', user.uid);

            // Check if user doc exists, if not create it
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    email: user.email,
                    role: 'admin',
                    createdAt: new Date().toISOString()
                });
            } else {
                await updateDoc(userRef, {
                    role: 'admin'
                });
            }

            setMessage('Success! You are now an Admin. Redirecting...');
            setTimeout(() => {
                // Force reload to update context
                window.location.href = '/dashboard/admin';
            }, 2000);
        } catch (error: any) {
            console.error(error);
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Admin Setup</h1>
                    <p className="mb-4">Please log in first to claim admin rights.</p>
                    <button
                        onClick={() => router.push('/auth/login?redirect=/admin-setup')}
                        className="bg-melagro-primary text-white px-6 py-2 rounded-lg"
                    >
                        Log In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
                <h1 className="text-2xl font-bold mb-2">Claim Admin Access</h1>
                <p className="text-gray-600 mb-6">
                    Current User: <span className="font-mono font-bold">{user?.email}</span>
                </p>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 ${message.includes('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message}
                    </div>
                )}

                <button
                    onClick={handleMakeAdmin}
                    disabled={loading}
                    className="w-full bg-melagro-primary text-white py-3 rounded-xl font-bold hover:bg-melagro-secondary transition-colors disabled:opacity-50"
                >
                    {loading ? 'Processing...' : 'Make Me Admin'}
                </button>

                <p className="mt-4 text-xs text-gray-400">
                    This is a temporary setup page. Delete this route after use for security.
                </p>
            </div>
        </div>
    );
}
