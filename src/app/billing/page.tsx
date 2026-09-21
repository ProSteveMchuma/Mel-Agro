import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Link from 'next/link';

export default function BillingPolicy() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-gray-900 mb-6">Billing Policy</h1>
                    <div className="prose prose-green max-w-none text-gray-600">
                        <p className="mb-4">At Mel-Agri, we are committed to transparent and secure billing practices.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Accepted Payment Methods</h2>
                        <ul className="list-disc pl-5 space-y-2 mb-4">
                            <li>M-Pesa Express (STK Push to your phone)</li>
                            <li>Buy Goods (Till) — pay via M-Pesa and enter your receipt code</li>
                            <li>Cash on Delivery or collection, where offered at checkout</li>
                            <li>
                                Bank transfer for{' '}
                                <Link href="/bulk" className="text-melagri-primary font-semibold hover:underline">
                                    bulk / wholesale orders
                                </Link>{' '}
                                only
                            </li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Payment Security</h2>
                        <p className="mb-4">
                            Checkout uses encrypted HTTPS. M-Pesa payments are processed through Safaricom.
                            We never ask you to share your M-Pesa PIN with Mel-Agri staff or on this website.
                        </p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Currency</h2>
                        <p className="mb-4">All prices are listed in Kenyan Shillings (KES) and are inclusive of VAT where applicable.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
