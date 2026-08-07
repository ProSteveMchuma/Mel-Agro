import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export const metadata: Metadata = {
    title: 'Privacy Policy',
    description: 'How Mel-Agri collects, uses, and protects your personal information when you shop for agricultural inputs on our platform.',
    alternates: { canonical: '/privacy' },
    robots: { index: true, follow: true },
};

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-gray-900 mb-6">Privacy Policy</h1>
                    <div className="prose prose-green max-w-none text-gray-600">
                        <p className="mb-4">This policy explains how Mel-Agri uses account, order, delivery, support, and website-interaction data to operate and improve the store. We do not sell personal data.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">1. Information We Collect</h2>
                        <p className="mb-4">We collect details you submit when creating an account, checking out, paying, requesting delivery, or contacting support. We also record product views, searches, cart actions, recommendation interactions, payment status, and fulfillment timestamps. Analytics are designed to avoid storing search terms that look like phone numbers or email addresses.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">2. How We Use Your Information</h2>
                        <p className="mb-4">We use this information to process orders, prevent fraud, provide support, estimate delivery, identify operational problems, understand aggregate demand, and—when enabled—rank product suggestions and estimate likely reorder timing. Recommendations show a reason and do not remove access to the full catalog.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">3. Personalization and automated assistance</h2>
                        <p className="mb-4">You can turn product personalization off from the recommendation area. Cart-recovery contact requires a separate opt-in and is limited by cooldown and attempt controls. AgroBot is an automated guided assistant: it uses the live catalog, configured delivery information, and your signed-in order history, but it does not prescribe pesticide or veterinary dosage, mixing, or diagnosis. High-impact operational actions remain subject to staff review.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">4. Retention and sharing</h2>
                        <p className="mb-4">Short-lived visit-deduplication records are retained for 2 days. Search and recommendation aggregates are retained for about 13 months; purchase reconciliation and recorded operational outcomes for up to 24 months. Order and financial records may be retained longer where required for accounting, legal obligations, disputes, or fraud prevention. We share necessary data only with service providers involved in hosting, payments, communications, and delivery.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">5. Security and your choices</h2>
                        <p className="mb-4">We implement appropriate security measures to protect your personal information from unauthorized access or disclosure.</p>
                        <p className="mb-4">You may update your profile and communication preferences, opt out of personalization or cart recovery, and contact Mel-Agri to request access, correction, or deletion where applicable. Some transaction records cannot be deleted immediately when legal retention duties apply.</p>

                        <p className="mt-8 text-sm text-gray-400">Last updated: August 2026</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
