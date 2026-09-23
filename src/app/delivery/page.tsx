import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Link from 'next/link';
import MarketingPageView from '@/components/cms/MarketingPageView';
import { DELIVERY_ZONES, FREE_SHIPPING_THRESHOLD } from '@/lib/delivery';
import { getLiveCmsPage } from '@/lib/cms-pages-server';
import type { MarketingBlocksPage } from '@/lib/cms-marketing';

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

export default async function DeliveryInfo() {
    const { content } = await getLiveCmsPage('delivery');
    const zones = DELIVERY_ZONES.filter((z) => z.regions[0] !== 'Other');

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto space-y-10">
                    <MarketingPageView content={content as MarketingBlocksPage} />

                    <section>
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
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery rates</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            Final cost is confirmed at checkout when you select your county. Free delivery applies on orders of KES{' '}
                            {FREE_SHIPPING_THRESHOLD.toLocaleString()} or more. Pickup is always free in Machakos.
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

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Track or return</h2>
                        <p className="text-gray-600 mb-4">
                            Open your{' '}
                            <Link href="/dashboard/user?tab=orders" className="font-semibold text-melagri-primary hover:underline">
                                order dashboard
                            </Link>{' '}
                            to track shipments, or read the{' '}
                            <Link href="/returns" className="font-semibold text-melagri-primary hover:underline">
                                return policy
                            </Link>
                            .
                        </p>
                    </section>
                </div>
            </main>
            <Footer />
        </div>
    );
}
