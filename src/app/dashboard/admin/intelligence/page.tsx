"use client";
import { useUsers } from "@/context/UserContext";
import { CATEGORY_ICONS } from "@/components/SidebarCategories";
import Link from "next/link";

export default function IntelligencePage() {
    const { users } = useUsers();

    // Filter to only show users with behavioral data
    const intelligentUsers = users
        .filter(u => u.affinityIndex && Object.keys(u.affinityIndex).length > 0)
        .sort((a, b) => {
            const sumA = Object.values(a.affinityIndex || {}).reduce((acc, val) => acc + val, 0);
            const sumB = Object.values(b.affinityIndex || {}).reduce((acc, val) => acc + val, 0);
            return sumB - sumA;
        });

    return (
        <div className="space-y-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Prophet: Behavioral Intelligence</h1>
                    <p className="text-gray-500 mt-1">Real-time demand forecasting and bottleneck analysis.</p>
                </div>
                <div className="flex gap-2">
                    <span className="px-4 py-2 bg-melagro-primary/10 text-melagro-primary text-xs font-black rounded-xl uppercase tracking-widest border border-melagro-primary/20">
                        {intelligentUsers.length} Predictive Profiles
                    </span>
                </div>
            </div>

            {/* CONVERSION FUNNEL VISUALIZATION */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Checkout Conversion Funnel</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Live Drop-off Tracking</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                    {[
                        { label: 'Cart Viewed', count: 120, conversion: '100%', color: 'bg-blue-500' },
                        { label: 'Shipping Info', count: 84, conversion: '70%', color: 'bg-indigo-500' },
                        { label: 'Payment Method', count: 62, conversion: '51%', color: 'bg-purple-500' },
                        { label: 'Order Complete', count: 48, conversion: '40%', color: 'bg-melagro-primary' }
                    ].map((step, i) => (
                        <div key={step.label} className="relative group">
                            <div className="h-24 bg-gray-50 rounded-2xl p-6 flex flex-col justify-center border border-gray-100 group-hover:border-melagro-primary/30 transition-all overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${step.color}`}></div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{step.label}</p>
                                        <p className="text-2xl font-black text-gray-900">{step.count}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-melagro-primary">{step.conversion}</p>
                                    </div>
                                </div>
                            </div>
                            {i < 3 && (
                                <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 bg-gray-100 rotate-45 border-t border-r border-gray-200"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {intelligentUsers.map(user => {
                    const totalScore = Object.values(user.affinityIndex || {}).reduce((acc, val) => acc + val, 0);
                    const topCategories = Object.entries(user.affinityIndex || {})
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 3);

                    const intentLevel = totalScore > 50 ? 'High' : totalScore > 20 ? 'Medium' : 'Low';
                    const intentColor = intentLevel === 'High' ? 'text-green-600 bg-green-50' : intentLevel === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-gray-600 bg-gray-50';

                    return (
                        <div key={user.uid} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center text-xl font-black text-gray-700 shadow-inner group-hover:from-melagro-primary group-hover:to-melagro-secondary group-hover:text-white transition-all duration-500">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
                                        <p className="text-sm text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${intentColor}`}>
                                    {intentLevel} Intent
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Top Affinities</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {topCategories.map(([cat, score]) => (
                                            <div key={cat} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-100 group-hover:border-melagro-primary/20 transition-colors">
                                                <span className="text-lg">{CATEGORY_ICONS[cat as keyof typeof CATEGORY_ICONS] || '📦'}</span>
                                                <span className="text-xs font-bold text-gray-700">{cat}</span>
                                                <span className="text-[10px] font-black text-melagro-primary ml-1">{score}pts</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-gray-50 flex justify-between items-center text-xs">
                                    <div className="text-gray-400 font-medium italic">
                                        Last Active: {user.lastBehavioralSync ? new Date(user.lastBehavioralSync).toLocaleString() : 'Recently'}
                                    </div>
                                    <Link
                                        href={`/dashboard/admin/users/${user.uid}`}
                                        className="text-melagro-primary font-bold hover:underline py-1"
                                    >
                                        Full Profile →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {intelligentUsers.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No Intelligence Data Yet</h3>
                        <p className="text-gray-500 max-w-sm mx-auto mt-2">The system is currently learning from customer behavior. Check back soon for AI-driven profiles.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
