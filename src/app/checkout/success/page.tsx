"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function OrderSuccessPage() {
    const orderNumber = "ORD-#4291";
    const estimatedDelivery = "Oct 12 - Oct 14";
    const deliveryTime = "Between 8:00 AM and 8:00 PM";

    const orders = [
        { name: "DAP Fertilizer - Planting", weight: "50kg", quantity: 2, price: "6,000" },
        { name: "Maize Seeds (HR 624)", weight: "2kg Pack", quantity: 1, price: "1,000" }
    ];

    const subtotal = 7600;
    const shipping = 400;
    const tax = 0;
    const total = 8050;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow py-12 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Success Banner */}
                    <div className="bg-white rounded-2xl p-12 border border-gray-200 mb-8">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            {/* Farmer Image */}
                            <div className="md:w-1/3">
                                <img
                                    src="https://images.unsplash.com/photo-1552679552-cb6ebb75f5b1?q=80&w=400&auto=format&fit=crop"
                                    alt="Happy Farmer"
                                    className="rounded-2xl w-full h-64 object-cover"
                                />
                            </div>

                            {/* Success Message */}
                            <div className="md:w-2/3">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-melagro-primary rounded-full flex items-center justify-center text-white font-bold">✓</div>
                                    <span className="text-sm font-bold text-melagro-primary uppercase tracking-wider">Order Successful!</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Thank you, John!</h1>
                                <p className="text-gray-600 mb-6 text-lg">
                                    Your order <span className="font-bold text-gray-900">#{orderNumber}</span> has been placed securely and is being processed.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Link href="/products" className="bg-melagro-primary hover:bg-melagro-secondary text-white px-6 py-3 rounded-lg font-bold transition-colors">
                                        Continue Shopping →
                                    </Link>
                                    <button className="border-2 border-gray-300 text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors">
                                        Print Receipt
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        {/* Order Summary */}
                        <div className="md:col-span-2">
                            <div className="bg-white rounded-2xl p-8 border border-gray-200">
                                <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                                <div className="space-y-4 mb-6 pb-6 border-b">
                                    {orders.map((order, idx) => (
                                        <div key={idx} className="flex gap-4">
                                            <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">{order.name}</p>
                                                <p className="text-sm text-gray-500">{order.weight}</p>
                                                <p className="text-sm text-gray-600 mt-1">Qty: {order.quantity}</p>
                                            </div>
                                            <p className="font-bold text-gray-900">KES {order.price}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal</span>
                                        <span className="font-semibold">KES {subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Shipping (Standard)</span>
                                        <span className="font-semibold">KES {shipping.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Tax (16% VAT Included)</span>
                                        <span className="font-semibold">Included</span>
                                    </div>
                                    <div className="border-t pt-3 flex justify-between text-lg font-bold text-melagro-primary">
                                        <span>Total</span>
                                        <span>KES {total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Delivery Info */}
                        <div className="space-y-6">
                            {/* Estimated Delivery */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">📦</span>
                                    <h3 className="font-bold text-gray-900">Estimated Delivery</h3>
                                </div>
                                <p className="text-sm font-semibold text-melagro-primary">{estimatedDelivery}</p>
                                <p className="text-xs text-gray-500 mt-1">Between 8:00 AM and 8:00 PM</p>
                            </div>

                            {/* Order Status */}
                            <div className="bg-white rounded-2xl p-6 border border-gray-200">
                                <h3 className="font-bold text-gray-900 mb-4">Order Status</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-melagro-primary flex items-center justify-center text-white text-xs font-bold">✓</div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Order Placed</p>
                                            <p className="text-xs text-gray-500">Oct 12, 2023</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full border-2 border-melagro-primary flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-melagro-primary"></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Processing</p>
                                            <p className="text-xs text-gray-500">We are picking your items</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center">
                                            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">Delivered</p>
                                            <p className="text-xs text-gray-500">Coming soon</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Details */}
                    <div className="bg-white rounded-2xl p-8 border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Shipping Address */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-xl">📍</span> Shipping To
                                </h3>
                                <div className="text-gray-600 space-y-1">
                                    <p className="font-semibold text-gray-900">John Dee</p>
                                    <p>Nairobi, Kenya</p>
                                    <p>+254 712 345 678</p>
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="text-xl">💳</span> Payment Method
                                </h3>
                                <div className="text-gray-600">
                                    <p className="font-semibold text-gray-900">M-Pesa Express</p>
                                    <p className="text-sm">Payment Confirmed</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Help Section */}
                    <div className="mt-12 bg-green-50 rounded-2xl p-8 border border-green-200">
                        <div className="flex items-start gap-4">
                            <span className="text-3xl">🌱</span>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-2">Need help with your order?</h3>
                                <p className="text-gray-600 mb-4">Contact support via WhatsApp for real-time assistance</p>
                                <Link href="#" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold transition-colors">
                                    <span>💬</span> WhatsApp Support
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
