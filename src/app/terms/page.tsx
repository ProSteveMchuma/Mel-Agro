import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import MarketingPageView from '@/components/cms/MarketingPageView';
import { getLiveCmsPage } from '@/lib/cms-pages-server';
import type { MarketingBlocksPage } from '@/lib/cms-marketing';

export const metadata: Metadata = {
    title: 'Terms & Conditions',
    description: 'Terms and conditions for using the Mel-Agri online farm-inputs storefront.',
    alternates: { canonical: '/terms' },
};

export default async function TermsPage() {
    const { content } = await getLiveCmsPage('terms');

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Header />
            <main className="flex-grow bg-gray-50 py-12">
                <div className="container-custom">
                    <div className="mx-auto max-w-4xl rounded-3xl border border-gray-100 bg-white p-8 shadow-sm md:p-10">
                        <MarketingPageView content={content as MarketingBlocksPage} />
                        <p className="mt-10 border-t border-gray-100 pt-6 text-sm text-gray-500">Last updated: January 20, 2026</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
