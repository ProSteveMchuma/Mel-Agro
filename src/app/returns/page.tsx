import Link from 'next/link';
import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import MarketingPageView from '@/components/cms/MarketingPageView';
import { getLiveCmsPage } from '@/lib/cms-pages-server';
import type { MarketingBlocksPage } from '@/lib/cms-marketing';

export const metadata: Metadata = {
    title: 'Returns & Refunds Policy',
    description:
        'Mel-Agri return policy: 7-day returns on defective or incorrect agricultural inputs. Original packaging required, sealed seed packs only. Read our full return guidelines.',
    alternates: { canonical: '/returns' },
    robots: { index: true, follow: true },
};

export default async function ReturnsPolicy() {
    const { content } = await getLiveCmsPage('returns');

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto space-y-6">
                    <MarketingPageView content={content as MarketingBlocksPage} />
                    <p className="text-sm text-gray-600">
                        Start a return from your{' '}
                        <Link href="/dashboard/user?tab=orders" className="font-bold text-melagri-primary hover:underline">
                            Orders Dashboard
                        </Link>
                        .
                    </p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
