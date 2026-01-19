"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ShippingPage() {
    return (
        <div className="min-h-screen flex flex-col bg-white">
            <Header />
            <main className="flex-grow">
                {/* Hero Section */}
                <div className="bg-gray-50 py-16 border-b border-gray-100">
                    <div className="container-custom">
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">Shipping Information</h1>
                        <p className="text-lg text-gray-600 max-w-2xl">
                            Everything you need to know about how we deliver our premium agricultural products to your farm.
                        </p>
                    </div>
                </div>

                {/* Content Section */}
                <div className="container-custom py-16">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {/* Sidebar */}
                        <div className="md:col-span-1">
                            <nav className="sticky top-24 space-y-4">
                                <a href="#delivery-times" className="block text-melagro-primary font-bold">Delivery Times</a>
                                <a href="#shipping-costs" className="block text-gray-500 hover:text-melagro-primary transition-colors">Shipping Costs</a>
                                <a href="#tracking" className="block text-gray-500 hover:text-melagro-primary transition-colors">Order Tracking</a>
                                <a href="#returns" className="block text-gray-500 hover:text-melagro-primary transition-colors">Returns & Exchanges</a>
                            </nav>
                        </div>

                        {/* Main Content */}
                        <div className="md:col-span-2 prose prose-green max-w-none">
                            <section id="delivery-times" className="mb-12">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Times</h2>
                                <p className="text-gray-600 mb-4">
                                    We understand that timing is critical in agriculture. That's why we've partnered with the most reliable logistics providers in Kenya to ensure your inputs arrive when you need them.
                                </p>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-6">
                                    <h3 className="font-bold text-gray-900 mb-4">Estimated Timelines:</h3>
                                    <ul className="space-y-4">
                                        <li className="flex justify-between border-b border-gray-200 pb-2">
                                            <span className="text-gray-600">Nairobi & Environs</span>
                                            <span className="font-bold text-melagro-primary text-sm">Same Day / 24 Hours</span>
                                        </li>
                                        <li className="flex justify-between border-b border-gray-200 pb-2">
                                            <span className="text-gray-600">Major Towns (Nakuru, Kisumu, Eldoret, etc.)</span>
                                            <span className="font-bold text-melagro-primary text-sm">24 - 48 Hours</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span className="text-gray-600">Remote / Field Locations</span>
                                            <span className="font-bold text-melagro-primary text-sm">48 - 72 Hours</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p>Orders placed before 12:00 PM are processed same-day. Orders placed on Sundays or Public Holidays will be processed the next business day.</p>
                                </div>
                            </section>

                            <section id="shipping-costs" className="mb-12">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Shipping Costs</h2>
                                <p className="text-gray-600 mb-6">
                                    Our shipping rates are calculated based on the weight of the items and the delivery distance. You will see the final shipping cost at checkout before you complete your purchase.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    <div className="p-6 rounded-2xl border-2 border-melagro-primary/10 bg-melagro-primary/[0.02]">
                                        <h4 className="font-bold text-gray-900 mb-2">Free Delivery</h4>
                                        <p className="text-sm text-gray-600">On all orders above KSh 20,000 within Nairobi.</p>
                                    </div>
                                    <div className="p-6 rounded-2xl border-2 border-gray-100">
                                        <h4 className="font-bold text-gray-900 mb-2">Flexible Rates</h4>
                                        <p className="text-sm text-gray-600">Competitive rates for bulk orders and country-wide delivery.</p>
                                    </div>
                                </div>
                            </section>

                            <section id="tracking" className="mb-12">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Tracking</h2>
                                <p className="text-gray-600 mb-4">
                                    Once your order has been dispatched, you will receive an SMS and an email with a tracking link. You can also track your order directly from your dashboard.
                                </p>
                                <button className="btn-primary">Track My Order</button>
                            </section>

                            <section id="returns" className="mb-12">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Returns & Exchanges</h2>
                                <p className="text-gray-600 mb-4">
                                    We stand by the quality of our products. If you receive an item that is damaged or not as described, you can request a return within 7 days of delivery.
                                </p>
                                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
                                    <li>Items must be in their original packaging.</li>
                                    <li>Seeds must not have been opened or planted.</li>
                                    <li>Proof of purchase (invoice/receipt) is required.</li>
                                </ul>
                                <p className="text-sm text-gray-500 italic">
                                    *Perishable items and customized gear may have different return policies.
                                </p>
                            </section>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
