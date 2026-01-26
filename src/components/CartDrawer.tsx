"use client";

import { useCart } from "@/context/CartContext";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";

export default function CartDrawer() {
    const { isCartOpen, toggleCart, cartItems, updateQuantity, removeFromCart, cartTotal } = useCart();
    const drawerRef = useRef<HTMLDivElement>(null);

    // Close drawer when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target as Node) && isCartOpen) {
                toggleCart();
            }
        };

        if (isCartOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "hidden"; // Prevent scrolling
        } else {
            document.body.style.overflow = "unset";
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.body.style.overflow = "unset";
        };
    }, [isCartOpen, toggleCart]);

    if (!isCartOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" aria-hidden="true" />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">Your Cart ({cartItems.length})</h2>
                    <button
                        onClick={toggleCart}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Free Shipping Progress */}
                <div className="bg-melagri-primary/5 p-4 border-b border-gray-100">
                    {cartTotal >= 5000 ? (
                        <div className="text-sm text-green-700 font-bold flex items-center justify-center gap-2 bg-green-50 p-2 rounded-lg border border-green-100">
                            <span>🎉</span> You've got <span className="uppercase">Free Shipping</span>!
                        </div>
                    ) : (
                        <div>
                            <p className="text-xs text-gray-600 mb-1.5 text-center">
                                Add <span className="font-bold text-melagri-primary">KES {(5000 - cartTotal).toLocaleString()}</span> more for <span className="font-bold">Free Shipping</span>
                            </p>
                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-melagri-primary transition-all duration-500 ease-out"
                                    style={{ width: `${Math.min((cartTotal / 5000) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Items */}
                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <p className="text-lg font-medium mb-2">Your cart is empty</p>
                            <p className="text-sm mb-6">Looks like you haven't added any items yet.</p>
                            <button onClick={toggleCart} className="btn-secondary">
                                Continue Shopping
                            </button>
                        </div>
                    ) : (
                        cartItems.map((item) => (
                            <div key={item.cartItemId} className="flex gap-4">
                                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden relative border border-gray-200">
                                    {item.image ? (
                                        <Image src={item.image} alt={item.name} fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-gray-900 line-clamp-2 text-sm">{item.name}</h3>
                                        <button
                                            onClick={() => removeFromCart(item.cartItemId)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                    <p className="text-melagri-primary font-bold text-sm mb-2">KES {item.price.toLocaleString()}</p>
                                    <div className="flex items-center border border-gray-200 rounded-lg w-24">
                                        <button
                                            onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                                            className="w-8 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-l-lg transition-colors"
                                        >
                                            -
                                        </button>
                                        <span className="flex-1 text-center text-sm font-medium">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                                            className="w-8 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-r-lg transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {cartItems.length > 0 && (
                    <div className="p-6 border-t border-gray-100 bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="text-xl font-bold text-gray-900">KES {cartTotal.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-6 text-center">Shipping and taxes calculated at checkout.</p>
                        <div className="space-y-3">
                            <Link
                                href="/checkout"
                                onClick={toggleCart}
                                className="block w-full btn-primary text-center py-3 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
                            >
                                Checkout Now
                            </Link>
                            <Link
                                href="/cart"
                                onClick={toggleCart}
                                className="block w-full btn-secondary text-center py-3"
                            >
                                View Cart
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
