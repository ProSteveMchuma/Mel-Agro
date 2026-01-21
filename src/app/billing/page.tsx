import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function BillingPolicy() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-gray-900 mb-6">Billing Policy</h1>
                    <div className="prose prose-green max-w-none text-gray-600">
                        <p className="mb-4">At Mel-Agro, we are committed to transparent and secure billing practices.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Accepted Payment Methods</h2>
                        <ul className="list-disc pl-5 space-y-2 mb-4">
                            <li>M-Pesa (Safaricom)</li>
                            <li>Credit/Debit Cards (Visa, MasterCard)</li>
                            <li>Bank Transfer (for bulk orders only)</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Payment Security</h2>
                        <p className="mb-4">All transactions are encrypted using SSL technology. We do not store your credit card information on our servers.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Currency</h2>
                        <p className="mb-4">All prices are listed in Kenyan Shillings (KES) and are inclusive of VAT where applicable.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
