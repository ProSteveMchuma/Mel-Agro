"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { getAuth } from "firebase/auth";

async function authedFetch(url: string, init: RequestInit = {}) {
    const token = await getAuth().currentUser?.getIdToken();
    return fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });
}

export default function MpesaSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [config, setConfig] = useState<any>(null);
    const [baseUrl, setBaseUrl] = useState('');
    const [responseType, setResponseType] = useState<'Completed' | 'Cancelled'>('Completed');

    useEffect(() => {
        loadConfig();
    }, []);

    async function loadConfig() {
        setLoading(true);
        try {
            const res = await authedFetch('/api/payment/mpesa/register-c2b', { method: 'GET' });
            const data = await res.json();
            if (data.success) {
                setConfig(data.registered ? data : null);
                if (data.confirmationURL) {
                    const m = data.confirmationURL.match(/^(https?:\/\/[^/]+)/);
                    if (m) setBaseUrl(m[1]);
                }
            }
        } catch (e) { /* ignore */ }
        finally { setLoading(false); }
    }

    async function handleRegister() {
        if (!baseUrl) {
            toast.error("Enter the base URL of your deployed site");
            return;
        }
        setRegistering(true);
        const t = toast.loading("Registering C2B URLs with Safaricom...");
        try {
            const res = await authedFetch('/api/payment/mpesa/register-c2b', {
                method: 'POST',
                body: JSON.stringify({ baseUrl, responseType }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(data.message || "C2B URLs registered", { id: t });
                await loadConfig();
            } else {
                toast.error(data.message || "Registration failed", { id: t, duration: 7000 });
            }
        } catch (e: any) {
            toast.error(e?.message || "Registration failed", { id: t });
        } finally {
            setRegistering(false);
        }
    }

    return (
        <div className="space-y-8 pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/dashboard/admin/settings" className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-melagri-primary">
                        ← Settings
                    </Link>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter mt-2">M-Pesa Configuration</h1>
                    <p className="text-gray-500 text-sm mt-1">Register Safaricom C2B URLs so Buy Goods payments auto-match to orders.</p>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                <h3 className="font-black text-blue-900 text-sm mb-2">What does this do?</h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                    When you register C2B URLs, Safaricom calls your site every time someone pays into your Till (3130847) — even outside your STK push checkout. The system tries to match the payment to an unpaid order by phone+amount or order ID, and auto-marks it Paid. No admin intervention needed.
                </p>
                <p className="text-xs text-blue-700 mt-3">You only need to register once per environment. Re-register if your domain or callback paths change.</p>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Current Status</h2>
                {loading ? (
                    <p className="text-gray-400 text-sm">Loading...</p>
                ) : config ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest">
                                {config.success ? 'Registered' : 'Registration may have failed'}
                            </span>
                            <span className="text-xs text-gray-500">
                                Last registered {config.registeredAt ? new Date(config.registeredAt).toLocaleString() : 'unknown'}
                            </span>
                        </div>
                        <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500 font-bold">Confirmation URL</span><code className="font-mono text-xs break-all max-w-md text-right">{config.confirmationURL}</code></div>
                            <div className="flex justify-between"><span className="text-gray-500 font-bold">Validation URL</span><code className="font-mono text-xs break-all max-w-md text-right">{config.validationURL}</code></div>
                            <div className="flex justify-between"><span className="text-gray-500 font-bold">Response Type</span><span className="font-bold">{config.responseType}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500 font-bold">Short Code</span><code className="font-mono text-xs">{config.shortCode}</code></div>
                            <div className="flex justify-between"><span className="text-gray-500 font-bold">Registered By</span><span className="text-xs">{config.registeredByEmail}</span></div>
                        </div>
                        {config.response?.errorMessage && (
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700">
                                <p className="font-bold mb-1">Daraja error</p>
                                <p>{config.response.errorMessage}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No C2B URLs registered yet.</p>
                )}
            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">{config ? 'Re-register URLs' : 'Register URLs'}</h2>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Base URL</label>
                        <input
                            type="url"
                            placeholder="https://www.melagri.com"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-4 focus:ring-melagri-primary/10 focus:bg-white focus:border-melagri-primary outline-none transition-all font-mono text-sm"
                        />
                        <p className="text-[10px] text-gray-400 mt-2">
                            Will register: <code>{baseUrl || 'https://...'}/api/payment/mpesa/c2b-confirmation</code> and <code>/c2b-validation</code>
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Response Type</label>
                        <select
                            value={responseType}
                            onChange={(e) => setResponseType(e.target.value as any)}
                            className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-melagri-primary outline-none font-bold text-sm"
                        >
                            <option value="Completed">Completed — proceed if validation URL fails</option>
                            <option value="Cancelled">Cancelled — reject if validation URL fails</option>
                        </select>
                        <p className="text-[10px] text-gray-400 mt-2">Recommended: Completed (don't reject payments if our server is briefly unreachable).</p>
                    </div>

                    <button
                        onClick={handleRegister}
                        disabled={registering || !baseUrl}
                        className="w-full py-4 bg-melagri-primary text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-melagri-primary/20 hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {registering ? 'Registering...' : config ? 'Re-Register URLs' : 'Register C2B URLs'}
                    </button>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                <h3 className="font-black text-amber-900 text-sm mb-2">⚠️ Production note</h3>
                <p className="text-sm text-amber-800 leading-relaxed">
                    For production C2B to work, the URLs you register here must be publicly reachable HTTPS endpoints. Safaricom has an IP allowlist enabled by default — if you see callbacks being rejected in your logs, set <code className="bg-amber-100 px-1 rounded">MPESA_DISABLE_IP_CHECK=true</code> temporarily to debug.
                </p>
            </div>
        </div>
    );
}
