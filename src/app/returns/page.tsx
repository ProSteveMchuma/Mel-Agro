import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function ReturnsPolicy() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-gray-900 mb-6">Return Policy</h1>
                    <div className="prose prose-green max-w-none text-gray-600">
                        <p className="mb-4">We want you to be completely satisfied with your purchase. If you receive a defective or incorrect item, we are here to help.</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Eligibility for Returns</h2>
                        <ul className="list-disc pl-5 space-y-2 mb-4">
                            <li>Items must be returned within 7 days of delivery.</li>
                            <li>Items must be unused and in their original packaging.</li>
                            <li>Perishable goods (like certain seeds or live plants) may not be eligible for return.</li>
                        </ul>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">How to Initiate a Return</h2>
                        <p className="mb-4">Go to your <Link href="/dashboard/user?tab=orders" className="text-melagro-primary font-bold hover:underline">Orders Dashboard</Link>, select the order, and click "Request Return".</p>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Refunds</h2>
                        <p className="mb-4">Once we receive and inspect your return, we will notify you of the approval or rejection of your refund. Approved refunds are processed to your original payment method (M-Pesa or Card) within 5-7 business days.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
