"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSearchParams } from "next/navigation";
import { useOrders, Order } from "@/context/OrderContext";
import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { InvoiceTemplate } from "@/components/documents/InvoiceTemplate";
import { ReceiptTemplate } from "@/components/documents/ReceiptTemplate";
import { format } from "date-fns";

function OrderSuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");
    const { orders } = useOrders();
    const [order, setOrder] = useState<Order | null>(null);
    const [isNotFound, setIsNotFound] = useState(false);
    const [activeDocument, setActiveDocument] = useState<'invoice' | 'receipt' | null>(null);

    useEffect(() => {
        if (order) {
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#22c55e', '#16a34a', '#ffffff']
            });
        }
    }, [order]);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) return;

            // 1. Try local context first
            const foundOrder = orders.find((o) => o.id === orderId);
            if (foundOrder) {
                setOrder(foundOrder);
                return;
            }

            // 2. Fallback to direct fetch from Firestore
            try {
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');
                const orderRef = doc(db, 'orders', orderId);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    setOrder({ id: orderSnap.id, ...orderSnap.data() } as Order);
                } else {
                    // Give it one more try after a delay or mark as not found
                    setTimeout(async () => {
                        const retrySnap = await getDoc(orderRef);
                        if (retrySnap.exists()) {
                            setOrder({ id: retrySnap.id, ...retrySnap.data() } as Order);
                        } else {
                            setIsNotFound(true);
                        }
                    }, 2000);
                }
            } catch (err) {
                console.error("Error fetching order in success page:", err);
            }
        };

        fetchOrder();
    }, [orderId, orders]);

    if (isNotFound) {
        return (
            <div className="flex-grow flex items-center justify-center py-20">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h2>
                    <p className="text-gray-500 mb-8">We couldn't find the details for order #{orderId?.slice(0, 8)}</p>
                    <Link href="/dashboard/user" className="bg-melagro-primary text-white px-8 py-3 rounded-xl font-bold">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex-grow flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading order details...</p>
                </div>
            </div>
        );
    }

    return (
        <main className="flex-grow py-12 px-4">
            {/* Document Overlay (Invoice or Receipt) */}
            {activeDocument && (
                <div className="fixed inset-0 z-[100] bg-white overflow-auto print:overflow-visible">
                    <div className="p-4 print:hidden flex justify-between items-center bg-gray-900 text-white sticky top-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setActiveDocument(null)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                            </button>
                            <span className="font-bold">
                                {activeDocument === 'invoice' ? 'Official Invoice' : 'Receipt'}: #{order.id.slice(0, 8)}
                            </span>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={() => window.print()} className="bg-melagro-primary px-4 py-2 rounded-lg hover:bg-melagro-secondary text-sm font-bold">Print / Save PDF</button>
                            <button onClick={() => setActiveDocument(null)} className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 text-sm font-bold">Close</button>
                        </div>
                    </div>
                    <div className="p-8 print:p-0">
                        {activeDocument === 'invoice' ? (
                            <InvoiceTemplate order={order} />
                        ) : (
                            <ReceiptTemplate order={order} />
                        )}
                    </div>
                </div>
            )}

            <div className="max-w-4xl mx-auto">
                {/* Success Banner */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 mb-8 shadow-xl shadow-green-500/5 overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-0 opacity-50"></div>

                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        {/* Farmer Image */}
                        <div className="md:w-1/3 relative h-64">
                            <Image
                                src="https://images.unsplash.com/photo-1595113316349-9fa4ee24f884?q=80&w=800&auto=format&fit=crop"
                                alt="Happy Farmer"
                                fill
                                className="rounded-2xl object-cover shadow-lg"
                            />
                        </div>

                        {/* Success Message */}
                        <div className="md:w-2/3">
                            <div className="inline-flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full mb-6">
                                <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                                <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">Order Verified</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Success!</h1>
                            <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                                Thank you for your order <span className="font-black text-gray-900">#{order.id.slice(0, 8)}</span>.
                                We've sent an <strong>Email, SMS and WhatsApp</strong> confirmation to your registered contacts.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/products" className="bg-[#22c55e] hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-black transition-all shadow-lg shadow-green-200 text-center print:hidden">
                                    Shop More
                                </Link>
                                <button
                                    onClick={() => setActiveDocument('invoice')}
                                    className="border-2 border-melagro-primary text-melagro-primary bg-white px-8 py-4 rounded-2xl font-black hover:bg-green-50 transition-all text-center print:hidden flex items-center justify-center gap-2"
                                >
                                    <span>📄</span> Official Invoice
                                </button>
                                <button
                                    onClick={() => setActiveDocument('receipt')}
                                    className="border-2 border-gray-900 bg-gray-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-black transition-all text-center print:hidden flex items-center justify-center gap-2"
                                >
                                    <span>🖨️</span> Print Receipt
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8"
                >
                    {/* Order Summary */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-2xl p-8 border border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

                            <div className="space-y-4 mb-6 pb-6 border-b">
                                {order.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="w-16 h-16 bg-gray-200 rounded-lg relative overflow-hidden">
                                            {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{item.name}</p>
                                            <p className="text-sm text-gray-500">{item.weight || 'N/A'}</p>
                                            <p className="text-sm text-gray-600 mt-1">Qty: {item.quantity}</p>
                                        </div>
                                        <p className="font-bold text-gray-900">KES {item.price.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span className="font-semibold">KES {order.total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping</span>
                                    <span className="font-semibold">Calculated at checkout</span>
                                </div>
                                <div className="border-t pt-3 flex justify-between text-lg font-bold text-melagro-primary">
                                    <span>Total</span>
                                    <span>KES {order.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="space-y-6">
                        {/* Order Status */}
                        {/* Order Timeline */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                            <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest mb-8">Shipment Progress</h3>
                            <div className="space-y-8 relative">
                                {/* Vertical Line */}
                                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-100"></div>

                                {/* Step 1: Placed */}
                                <div className="flex items-start gap-4 relative">
                                    <div className="w-6 h-6 rounded-full bg-melagro-primary flex items-center justify-center text-white z-10 shadow-lg shadow-green-500/20">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900">Order Placed</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase">{format(new Date(order.date), "MMM d, yyyy • h:mm a")}</p>
                                    </div>
                                </div>

                                {/* Step 2: Processing */}
                                <div className="flex items-start gap-4 relative">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${order.status === 'Processing' ? 'bg-melagro-primary animate-pulse shadow-lg shadow-green-500/20' : 'bg-melagro-primary'}`}>
                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-gray-900">Processing</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase">Prepping for dispatch</p>
                                    </div>
                                </div>

                                {/* Step 3: Shipped */}
                                <div className="flex items-start gap-4 relative">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 bg-gray-100`}>
                                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                                    </div>
                                    <div className="opacity-40">
                                        <p className="text-sm font-black text-gray-900">Shipped</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase">Pending Transit</p>
                                    </div>
                                </div>

                                {/* Step 4: Delivered */}
                                <div className="flex items-start gap-4 relative">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center z-10 bg-gray-100`}>
                                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                                    </div>
                                    <div className="opacity-40">
                                        <p className="text-sm font-black text-gray-900">Delivered</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase">Pending Arrival</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Help Section */}
                <div className="mt-12 bg-green-50 rounded-2xl p-8 border border-green-200">
                    <div className="flex items-start gap-4">
                        <span className="text-3xl">🌱</span>
                        <div>
                            <h3 className="font-bold text-gray-900 mb-2">Need help with your order?</h3>
                            <p className="text-gray-600 mb-4">Contact support via WhatsApp for real-time assistance</p>
                            <Link href="https://wa.me/254748970757" target="_blank" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold transition-colors">
                                <span>💬</span> WhatsApp Support
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main >
    );
}

export default function OrderSuccessPage() {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />
            <Suspense fallback={
                <div className="flex-grow flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-melagro-primary mx-auto mb-4"></div>
                        <p className="text-gray-500">Loading...</p>
                    </div>
                </div>
            }>
                <OrderSuccessContent />
            </Suspense>
            <Footer />
        </div>
    );
}
