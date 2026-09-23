import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import BulkInquiryForm from '@/components/BulkInquiryForm';
import MarketingPageView from '@/components/cms/MarketingPageView';
import { getLiveCmsPage } from '@/lib/cms-pages-server';
import type { MarketingBlocksPage } from '@/lib/cms-marketing';

export const metadata: Metadata = {
    title: 'Bulk Farm Inputs & Wholesale Agrochemicals Kenya',
    description:
        'Bulk supply and wholesale agricultural orders in Kenya are fulfilled via Makamithi, Mel-Agri’s parent company. Cooperatives, large farms, and institutions — request a wholesale quote today.',
    alternates: { canonical: '/bulk' },
    openGraph: {
        title: 'Bulk Farm Inputs & Wholesale Agrochemicals Kenya | Mel-Agri',
        description: 'Bulk supply and wholesale orders are offered via Makamithi, Mel-Agri’s parent company.',
        url: '/bulk',
    },
};

export default async function BulkOrders() {
    const { content } = await getLiveCmsPage('bulk');

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
                    <MarketingPageView content={content as MarketingBlocksPage} />
                    <BulkInquiryForm />
                </div>
            </main>
            <Footer />
        </div>
    );
}
