"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from "@/context/CartContext";
import { useRouter } from 'next/navigation';
import Image from "next/image";

export default function CartPage() {
    const { cartItems, updateQuantity, removeFromCart, cartTotal } = useCart();
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    const shipping = 500; // Flat rate
    const total = cartTotal + shipping;

    const handleCheckout = () => {
        if (!isAuthenticated) {
            router.push('/auth/login?callbackUrl=/checkout');
        } else {
            router.push('/checkout');
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow py-12">
                <div className="container-custom">
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Shopping Cart</h1>

                    {cartItems.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <p className="text-xl text-gray-900 font-bold mb-2">Your cart is empty</p>
                            <p className="text-gray-500 mb-8">Looks like you haven't added any items yet.</p>
                            <Link href="/products" className="btn-primary inline-block">
                                Start Shopping
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-8">
                            {/* Cart Items */}
                            <div className="lg:w-2/3 space-y-4">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-6 border border-gray-100">
                                        <div className="w-24 h-24 bg-gray-100 rounded-xl flex-shrink-0 overflow-hidden relative border border-gray-200">
                                            {item.image ? (
                                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-grow text-center sm:text-left">
                                            <h3 className="text-lg font-bold text-gray-900 mb-1">{item.name}</h3>
                                            <p className="text-sm text-gray-500 mb-2">{item.category}</p>
                                            <p className="text-melagro-primary font-bold text-lg">KES {item.price.toLocaleString()}</p>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center border border-gray-200 rounded-lg">
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-l-lg transition-colors font-bold"
                                                >
                                                    -
                                                </button>
                                                <span className="w-12 text-center font-medium">{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-r-lg transition-colors font-bold"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                title="Remove Item"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Order Summary */}
                            <div className="lg:w-1/3">
                                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                                    <h2 className="text-xl font-bold mb-6 text-gray-900">Order Summary</h2>

                                    <div className="space-y-4 mb-6 text-gray-600">
                                        <div className="flex justify-between">
                                            <span>Subtotal</span>
                                            <span className="font-bold text-gray-900">KES {cartTotal.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Shipping Estimate</span>
                                            <span className="font-bold text-gray-900">KES {shipping.toLocaleString()}</span>
                                        </div>
                                        <div className="border-t border-gray-100 pt-4 flex justify-between text-lg font-extrabold text-melagro-primary">
                                            <span>Total</span>
                                            <span>KES {total.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleCheckout}
                                        className="w-full btn-primary py-4 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
                                    >
                                        Proceed to Checkout
                                    </button>

                                    <p className="text-xs text-gray-500 text-center mt-4 flex items-center justify-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                        Secure checkout powered by M-Pesa
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
}
