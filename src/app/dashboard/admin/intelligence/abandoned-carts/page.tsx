"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { generateAbandonedCartNudge, getWhatsAppDirectUrl } from "@/lib/whatsapp";

interface AbandonedCart {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
    items: any[];
    total: number;
    updatedAt: string;
    status: string;
}

export default function AbandonedCartsPage() {
    const [carts, setCarts] = useState<AbandonedCart[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCarts = async () => {
            try {
                // Fetch carts that are 'active' and have items
                // We'll filter by 'updatedAt' client-side to find those older than 30 mins
                const q = query(
                    collection(db, "carts"),
                    where("status", "==", "active"),
                    orderBy("updatedAt", "desc"),
                    limit(50)
                );

                const snapshot = await getDocs(q);
                const now = new Date();
                const cartList = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() } as AbandonedCart))
                    .filter(cart => {
                        const updated = new Date(cart.updatedAt);
                        const diffMins = (now.getTime() - updated.getTime()) / (1000 * 60);
                        return diffMins > 30 && cart.items.length > 0;
                    });

                setCarts(cartList);
            } catch (error) {
                console.error("Error fetching abandoned carts:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCarts();
    }, []);

    const handleNudge = (cart: AbandonedCart) => {
        if (!cart.userPhone) {
            alert("No phone number available for this customer.");
            return;
        }
        const message = generateAbandonedCartNudge(cart.userName, cart.items, cart.total);
        const url = getWhatsAppDirectUrl(cart.userPhone, message);
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Abandoned Cart Recovery</h1>
                    <p className="text-gray-500 mt-1">Nudge high-intent customers who haven't completed checkout.</p>
                </div>
                <Link href="/dashboard/admin/intelligence" className="text-sm font-bold text-melagri-primary hover:underline">
                    ← Back to Intelligence
                </Link>
            </div>

            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100 uppercase text-[10px] tracking-widest font-black">
                            <tr>
                                <th className="px-8 py-5">Customer</th>
                                <th className="px-8 py-5">Stalled Items</th>
                                <th className="px-8 py-5">Value</th>
                                <th className="px-8 py-5">Idle Time</th>
                                <th className="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {carts.map(cart => {
                                const idleMins = Math.floor((new Date().getTime() - new Date(cart.updatedAt).getTime()) / (1000 * 60));
                                const idleStr = idleMins > 1440 ? `${Math.floor(idleMins / 1440)}d ago` : (idleMins > 60 ? `${Math.floor(idleMins / 60)}h ago` : `${idleMins}m ago`);

                                return (
                                    <tr key={cart.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div>
                                                <div className="font-bold text-gray-900 group-hover:text-melagri-primary transition-colors">{cart.userName}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{cart.userPhone || cart.userEmail}</div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-gray-600 italic">
                                            {cart.items.slice(0, 2).map(i => i.name).join(', ')}
                                            {cart.items.length > 2 && ` +${cart.items.length - 2} more`}
                                        </td>
                                        <td className="px-8 py-6 font-black text-gray-900">
                                            KES {cart.total.toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${idleMins > 180 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                                                }`}>
                                                {idleStr}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => handleNudge(cart)}
                                                className="bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 float-right"
                                            >
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.038 3.284l-.54 1.964 2.009-.528c.954.524 1.942.85 3.037.852 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.772-5.744-5.772zm3.374 8.086c-.1.272-.58.513-.801.551-.237.042-.46.079-.769-.015-.297-.091-.676-.239-1.144-.442-1.99-.861-3.284-2.885-3.383-3.018-.099-.134-.736-.979-.736-1.959 0-.979.512-1.46.694-1.658.183-.198.396-.247.53-.247.13 0 .26.012.37.012.11 0 .26-.041.408.321.148.36.512 1.25.56 1.348.049.099.083.214.016.347-.066.13-.1.214-.2.33-.1.115-.208.261-.297.35-.099.099-.198.198-.083.396.115.198.512.845 1.099 1.366.759.673 1.398.882 1.596.981.198.099.313.082.43-.049.115-.132.512-.596.644-.793.132-.198.26-.165.43-.099.172.066 1.09.514 1.277.613.183.1.312.148.363.23.049.082.049.479-.05.751z" /></svg>
                                                Nudge
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {carts.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                            <span className="text-2xl">🌱</span>
                                        </div>
                                        <p className="text-gray-400 font-bold uppercase text-xs">No significant abandoned carts detected right now.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gradient-to-br from-melagri-primary to-melagri-secondary p-8 rounded-[2.5rem] text-white shadow-xl">
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-80 mb-4">Pro Strategy</h3>
                    <p className="text-xl font-black leading-tight">"Nudging abandoned carts within 2 hours increases recovery chances by up to 45%."</p>
                    <p className="text-xs font-bold uppercase tracking-widest mt-6 opacity-60">— Mel-Agri AI Bot</p>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Recovery Insights</h3>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-3xl font-black text-gray-900">{carts.length}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Pending Recovery</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-melagri-primary">KES {carts.reduce((acc, c) => acc + c.total, 0).toLocaleString()}</p>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Stalled Revenue</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
