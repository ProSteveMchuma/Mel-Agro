"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useOrders, Order } from "@/context/OrderContext";
import { InvoiceTemplate } from "@/components/documents/InvoiceTemplate";
import { ReceiptTemplate } from "@/components/documents/ReceiptTemplate";

function SuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const { orders } = useOrders();
    const [order, setOrder] = useState<Order | null>(null);
    const [printMode, setPrintMode] = useState<'invoice' | 'receipt' | null>(null);

    useEffect(() => {
        if (orderId && orders.length > 0) {
            const foundOrder = orders.find(o => o.id === orderId);
            if (foundOrder) setOrder(foundOrder);
        }
    }, [orderId, orders]);

    const handlePrint = (type: 'invoice' | 'receipt') => {
        setPrintMode(type);
        // Removed auto-print to allow viewing first
    };

    return (
        <>
            {/* Print Overlay */}
            {printMode && order && (
                <div className="fixed inset-0 z-[100] bg-white overflow-auto print:overflow-visible">
                    <div className="p-4 print:hidden flex justify-between items-center bg-gray-900 text-white sticky top-0 z-50">
                        <div className="font-bold">View: {printMode.toUpperCase()}</div>
                        <div className="flex gap-4">
                            <button onClick={() => window.print()} className="bg-melagro-primary px-4 py-2 rounded-lg hover:bg-melagro-secondary flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                Print
                            </button>
                            <button onClick={() => setPrintMode(null)} className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600">Close</button>
                        </div>
                    </div>
                    <div className="p-4 md:p-8 print:p-0 max-w-4xl mx-auto">
                        {printMode === 'invoice' && <InvoiceTemplate order={order} />}
                        {printMode === 'receipt' && <ReceiptTemplate order={order} />}
                    </div>
                </div>
            )}

            <div className="print:hidden min-h-screen flex flex-col bg-gray-50 font-sans">
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

                        {order && (
                            <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-500 mb-2">Order #{order.id}</p>
                                <div className="flex gap-3 justify-center flex-wrap">
                                    <button onClick={() => handlePrint('invoice')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        View Invoice
                                    </button>
                                    {(order.paymentMethod === 'mpesa' || order.paymentMethod === 'card') && (
                                        <button onClick={() => handlePrint('receipt')} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            View Receipt
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

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
        </>
    );
}

export default function OrderSuccessPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary"></div></div>}>
            <SuccessContent />
        </Suspense>
    );
}
