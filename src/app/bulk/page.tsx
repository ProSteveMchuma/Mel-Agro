import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import BulkInquiryForm from '@/components/BulkInquiryForm';

export const metadata: Metadata = {
    title: 'Bulk Farm Inputs & Wholesale Agrochemicals Kenya',
    description: 'Bulk supply and wholesale agricultural orders in Kenya are fulfilled via Makamithi, Mel-Agri’s parent company. Cooperatives, large farms, and institutions — request a wholesale quote today.',
    alternates: { canonical: '/bulk' },
    openGraph: {
        title: 'Bulk Farm Inputs & Wholesale Agrochemicals Kenya | Mel-Agri',
        description: 'Bulk supply and wholesale orders are offered via Makamithi, Mel-Agri’s parent company.',
        url: '/bulk',
    },
};

export default function BulkOrders() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-gray-900 mb-6">Bulk & Wholesale Orders</h1>
                    <div className="prose prose-green max-w-none text-gray-600">
                        <p className="mb-4">
                            Are you a large-scale farmer, cooperative, or institution? We offer bulk supply and wholesale orders via <strong className="text-gray-900">Makamithi</strong>, our parent company — with special pricing and logistics for high-volume agricultural inputs.
                        </p>

                        <div className="not-prose mb-6 rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm text-green-900">
                            <p className="font-bold">Fulfilled by Makamithi</p>
                            <p className="mt-1 text-green-800">
                                Mel-Agri is the digital storefront. Wholesale and bulk supply are handled through Makamithi so you get parent-company pricing, stock depth, and delivery capacity.
                            </p>
                        </div>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Why Buy in Bulk?</h2>
                        <ul className="list-disc pl-5 space-y-2 mb-4">
                            <li>Wholesale pricing on fertilizers, seeds, agrochemicals, and equipment.</li>
                            <li>Dedicated account support through Makamithi.</li>
                            <li>Priority delivery logistics for high-volume orders.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Minimum Order Quantity (MOQ)</h2>
                        <p className="mb-4">Bulk pricing typically applies to orders exceeding KES 100,000 or 50 bags of inputs. Final terms are confirmed with the Makamithi wholesale team.</p>

                        <BulkInquiryForm />
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
