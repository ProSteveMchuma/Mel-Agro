"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function OrderSuccessPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow flex items-center justify-center py-12 px-4">
                <div className="bg-white p-8 md:p-12 rounded-3xl shadow-lg border border-gray-100 max-w-lg w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h1>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Thank you for shopping with MelAgro. Your order has been received and is being processed. You will receive a confirmation email shortly.
                    </p>

                    <div className="space-y-4">
                        <Link
                            href="/dashboard/user"
                            className="block w-full btn-primary py-3 text-lg shadow-md hover:shadow-lg transition-all"
                        >
                            View Your Order
                        </Link>

                        <Link
                            href="/products"
                            className="block w-full py-3 text-melagro-primary font-bold hover:bg-green-50 rounded-xl transition-colors"
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
