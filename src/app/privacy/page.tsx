import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import MarketingPageView from '@/components/cms/MarketingPageView';
import { getLiveCmsPage } from '@/lib/cms-pages-server';
import type { MarketingBlocksPage } from '@/lib/cms-marketing';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description:
        'How Mel-Agri collects, uses, and protects your personal information when you shop for agricultural inputs on our platform.',
    alternates: { canonical: '/privacy' },
    robots: { index: true, follow: true },
};

export default async function PrivacyPolicy() {
    const { content } = await getLiveCmsPage('privacy');

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
                    <MarketingPageView content={content as MarketingBlocksPage} />
                    <p className="mt-8 text-sm text-gray-400">Last updated: August 2026</p>
                </div>
            </main>
            <Footer />
        </div>
    );
}
