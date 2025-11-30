"use client";

import { useCart } from "@/context/CartContext";
import Image from "next/image";

interface OrderSummaryProps {
    shippingCost: number;
    shippingCounty?: string;
}

export default function OrderSummary({ shippingCost, shippingCounty }: OrderSummaryProps) {
    const { cartItems, cartTotal } = useCart();
    const total = cartTotal + shippingCost;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item) => (
                    <div key={item.id} className="flex gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg relative overflow-hidden flex-shrink-0">
                            {item.image ? (
                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
                            )}
                        </div>
                        <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-start">
                                <h3 className="text-sm font-medium text-gray-900 truncate pr-2">{item.name}</h3>
                                <button className="text-gray-400 hover:text-red-500 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                                <span className="text-sm font-bold text-gray-900">KES {(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span>KES {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                    <span>Shipping {shippingCounty ? `(${shippingCounty})` : ''}</span>
                    <span>KES {shippingCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span>KES {total.toLocaleString()}</span>
                </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-melagro-primary shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-gray-900">Fast Delivery</div>
                        <div className="text-[10px] text-gray-500">0-72 hrs delivery</div>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-melagro-primary shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-gray-900">Secure Payment</div>
                        <div className="text-[10px] text-gray-500">Encrypted transactions</div>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-melagro-primary shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-gray-900">Money-Back Guarantee</div>
                        <div className="text-[10px] text-gray-500">30-day return policy</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
