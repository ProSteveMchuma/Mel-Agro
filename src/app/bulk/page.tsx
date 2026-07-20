import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import BulkInquiryForm from '@/components/BulkInquiryForm';

export const metadata: Metadata = {
    title: 'Bulk Farm Inputs & Wholesale Agrochemicals Kenya',
    description: 'Special wholesale pricing and direct shipping logistics for bulk agricultural inputs in Kenya. Cooperatives, large farms, and institutions — get a bulk quote online today.',
    alternates: { canonical: '/bulk' },
    openGraph: {
        title: 'Bulk Farm Inputs & Wholesale Agrochemicals Kenya | Mel-Agri',
        description: 'Special wholesale pricing and direct shipping logistics for bulk agricultural inputs in Kenya.',
        url: '/bulk',
    },
};

export default function BulkOrders() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-gray-900 mb-6">Bulk Orders</h1>
                    <div className="prose prose-green max-w-none text-gray-600">
                        <p className="mb-4">Are you a large-scale farmer, cooperative, or institution? Mel-Agri offers special pricing and logistics for bulk orders.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Why Buy in Bulk?</h2>
                        <ul className="list-disc pl-5 space-y-2 mb-4">
                            <li>Discounted prices on fertilizers, seeds, and equipment.</li>
                            <li>Dedicated account manager.</li>
                            <li>Priority delivery logistics.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Minimum Order Quantity (MOQ)</h2>
                        <p className="mb-4">Bulk pricing applies to orders exceeding KES 100,000 or 50 bags of inputs.</p>

                        <BulkInquiryForm />
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
