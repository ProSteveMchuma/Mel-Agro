import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Link from 'next/link';
import { DELIVERY_ZONES, FREE_SHIPPING_THRESHOLD } from '@/lib/delivery';
import { PICKUP_STORE } from '@/lib/pickup';

export const metadata: Metadata = {
    title: 'Delivery Information — Rates, Pickup & Tracking Across Kenya',
    description:
        'Nationwide farm-input delivery rates by zone, free Machakos pickup, and SMS tracking. Free delivery on orders above the Mel-Agri threshold.',
    alternates: { canonical: '/delivery' },
    openGraph: {
        title: 'Delivery Information | Mel-Agri',
        description: 'Zone rates from Nairobi same-day to nationwide 1–4 days. Free Machakos pickup available.',
        url: '/delivery',
    },
};

export default function DeliveryInfo() {
    const zones = DELIVERY_ZONES.filter((z) => z.regions[0] !== 'Other');

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-gray-900 mb-4">Delivery Information</h1>
                    <p className="text-gray-600 mb-8">
                        Mel-Agri delivers seeds, fertilizers, and agrochemicals across Kenya. Choose home delivery at checkout,
                        or collect free from our Machakos collection point.
                    </p>

                    <div className="grid md:grid-cols-2 gap-4 mb-10">
                        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                            <h2 className="font-bold text-lg text-melagri-primary mb-2">Free delivery</h2>
                            <p className="text-sm text-gray-700">
                                On orders of KES {FREE_SHIPPING_THRESHOLD.toLocaleString()} or more, country-wide.
                            </p>
                        </div>
                        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                            <h2 className="font-bold text-lg text-amber-900 mb-2">Free pickup (Machakos only)</h2>
                            <p className="text-sm text-gray-700">
                                Collect at {PICKUP_STORE.label} — {PICKUP_STORE.etaText.toLowerCase()}. Available only in Machakos.
                            </p>
                        </div>
                    </div>

                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery times by region</h2>
                        <ul className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-5">
                            {zones.map((zone, idx) => (
                                <li
                                    key={zone.name}
                                    className={`flex justify-between gap-4 ${idx < zones.length - 1 ? 'border-b border-gray-200 pb-3' : ''}`}
                                >
                                    <div>
                                        <p className="text-gray-900 font-semibold text-sm">{zone.name}</p>
                                        <p className="text-xs text-gray-500 leading-snug">
                                            {zone.regions.slice(0, 4).join(', ')}
                                            {zone.regions.length > 4 ? `, +${zone.regions.length - 4} more` : ''}
                                        </p>
                                    </div>
                                    <span className="font-bold text-melagri-primary text-sm whitespace-nowrap">{zone.etaText}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                            Orders placed before 12:00 PM are processed same-day. Sunday and public-holiday orders process the next business day.
                        </p>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery rates</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Final cost is confirmed at checkout when you select your county. Pickup is always free in Machakos.
                        </p>
                        <div className="overflow-hidden rounded-2xl border border-gray-100">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-bold text-gray-700">Zone</th>
                                        <th className="text-right px-4 py-3 font-bold text-gray-700">Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {zones.map((zone) => (
                                        <tr key={zone.name} className="border-t border-gray-100">
                                            <td className="px-4 py-3 text-gray-700">{zone.name}</td>
                                            <td className="px-4 py-3 text-right font-bold text-melagri-primary">
                                                KES {zone.price.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Tracking your order</h2>
                        <p className="text-gray-600 mb-4">
                            When your order is dispatched you receive an SMS with a track link (including carrier details when available).
                            You can also open the order from your account dashboard.
                        </p>
                        <Link href="/dashboard/user?tab=orders" className="btn-primary inline-flex">
                            Track my order
                        </Link>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Returns</h2>
                        <p className="text-gray-600 mb-3">
                            Damaged or not-as-described items can be returned within 7 days of delivery or collection.
                            See the full <Link href="/returns" className="text-melagri-primary font-semibold hover:underline">return policy</Link>.
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
