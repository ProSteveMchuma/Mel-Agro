import Link from 'next/link';
import Footer from '@/components/Footer';
import Header from '@/components/Header';

export default function DeliveryInfo() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-grow container-custom py-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm max-w-4xl mx-auto">
                    <h1 className="text-3xl font-black text-gray-900 mb-6">Delivery Information</h1>
                    <div className="prose prose-green max-w-none text-gray-600">
                        <p className="mb-4">Mel-Agro offers reliable delivery across Kenya. We partner with trusted logistics providers to ensure your farm inputs arrive safely and on time.</p>

                        <div className="grid md:grid-cols-2 gap-6 my-8">
                            <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                <h3 className="font-bold text-lg text-melagro-primary mb-2">Nairobi Region</h3>
                                <p className="text-sm">Delivery within 24 hours. Free for orders over KES 5,000.</p>
                            </div>
                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                                <h3 className="font-bold text-lg text-blue-600 mb-2">Upcountry</h3>
                                <p className="text-sm">Delivery within 2-3 business days via Wells Fargo or G4S.</p>
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-gray-800 mt-6 mb-3">Tracking Your Order</h2>
                        <p className="mb-4">Once your order is dispatched, you will receive an SMS with a tracking link. You can also track your order directly from your User Dashboard.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
