"use client";
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';

export default function AdminSetupPage() {
    const { user, isAuthenticated } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [secretCode, setSecretCode] = useState('');
    const router = useRouter();

    const handleMakeAdmin = async () => {
        if (!user) return;
        if (!secretCode) {
            setMessage('Error: Enter the security code');
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            const idToken = await getAuth().currentUser?.getIdToken();
            const res = await fetch('/api/admin/claim-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                },
                body: JSON.stringify({ secretCode }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage('Success! You are now an Admin. Redirecting...');
                setTimeout(() => {
                    window.location.href = '/dashboard/admin';
                }, 1500);
            } else {
                setMessage(`Error: ${data.message || 'Verification failed'}`);
            }
        } catch (error: any) {
            setMessage(`Error: ${error?.message || 'Network error'}`);
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
                        onClick={() => router.push('/auth/login?callbackUrl=/admin-setup')}
                        className="bg-melagri-primary text-white px-6 py-2 rounded-lg"
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
                    Current User: <span className="font-mono font-bold">{user?.email || user?.phone || 'No Contact Info'}</span>
                </p>

                {message && (
                    <div className={`p-4 rounded-lg mb-6 ${message.includes('Success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message}
                    </div>
                )}

                <div className="mb-4 text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Security Code</label>
                    <input
                        type="password"
                        value={secretCode}
                        onChange={(e) => setSecretCode(e.target.value)}
                        placeholder="Enter admin secret"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-melagri-primary/20"
                        onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleMakeAdmin(); }}
                    />
                </div>

                <button
                    onClick={handleMakeAdmin}
                    disabled={loading || !secretCode}
                    className="w-full bg-melagri-primary text-white py-3 rounded-xl font-bold hover:bg-melagri-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Verifying...' : 'Verify & Make Me Admin'}
                </button>

                <p className="mt-4 text-xs text-gray-400">
                    ⚠️ Secret code is validated server-side using <code>ADMIN_SECRET_CODE</code> env var. Delete this route once admin setup is done.
                </p>
            </div>
        </div>
    );
}
