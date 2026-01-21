import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function BulkOrders() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-gray-900 mb-6">Bulk Orders</h1>
                    <div className="prose prose-green max-w-none text-gray-600">
                        <p className="mb-4">Are you a large-scale farmer, cooperative, or institution? Mel-Agro offers special pricing and logistics for bulk orders.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Why Buy in Bulk?</h2>
                        <ul className="list-disc pl-5 space-y-2 mb-4">
                            <li>Discounted prices on fertilizers, seeds, and equipment.</li>
                            <li>Dedicated account manager.</li>
                            <li>Priority delivery logistics.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Minimum Order Quantity (MOQ)</h2>
                        <p className="mb-4">Bulk pricing applies to orders exceeding KES 100,000 or 50 bags of inputs.</p>

                        <div className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 mt-8">
                            <h3 className="font-bold text-lg text-yellow-800 mb-2">Request a Quote</h3>
                            <p className="text-sm mb-4">Contact our sales team directly to discuss your needs.</p>
                            <a href="mailto:sales@melagro.com" className="inline-block bg-yellow-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-yellow-700 transition-colors">Contact Sales</a>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
