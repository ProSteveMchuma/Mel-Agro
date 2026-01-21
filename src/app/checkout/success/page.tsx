"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSearchParams } from "next/navigation";
import { useOrders, Order } from "@/context/OrderContext";
import { useEffect, useState, Suspense } from "react";
import Image from "next/image";

function OrderSuccessContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get("orderId");
    const { orders } = useOrders();
    const [order, setOrder] = useState<Order | null>(null);
    const [isNotFound, setIsNotFound] = useState(false);

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
                            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Thank you!</h1>
                            <p className="text-gray-600 mb-6 text-lg">
                                Your order <span className="font-bold text-gray-900">#{order.id.slice(0, 8)}</span> has been placed securely and is being processed.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/products" className="bg-melagro-primary hover:bg-melagro-secondary text-white px-6 py-3 rounded-lg font-bold transition-colors">
                                    Continue Shopping →
                                </Link>
                                <Link href="/dashboard/user" className="border-2 border-gray-300 text-gray-900 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors">
                                    View Order Status
                                </Link>
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
                        <div className="bg-white rounded-2xl p-6 border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4">Order Status</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-melagro-primary flex items-center justify-center text-white text-xs font-bold">✓</div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Order Placed</p>
                                        <p className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${order.status !== 'Cancelled' ? 'bg-melagro-primary border-melagro-primary' : 'border-gray-300'}`}>
                                        <div className={`w-2 h-2 rounded-full ${order.status !== 'Cancelled' ? 'bg-white' : 'bg-gray-300'}`}></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">Processing</p>
                                        <p className="text-xs text-gray-500">We are preparing your items</p>
                                    </div>
                                </div>
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
                            <Link href="https://wa.me/254748970757" target="_blank" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold transition-colors">
                                <span>💬</span> WhatsApp Support
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
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
