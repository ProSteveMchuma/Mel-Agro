"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function CheckoutPage() {
    const router = useRouter();
    const { cartItems, cartTotal, clearCart } = useCart();
    const { user } = useAuth();
    const { addOrder } = useOrders();

    const [currentStep, setCurrentStep] = useState(1); // 1: Shipping, 2: Payment, 3: Review
    const [isProcessing, setIsProcessing] = useState(false);

    const [shippingData, setShippingData] = useState({
        firstName: user?.name?.split(' ')[0] || '',
        lastName: user?.name?.split(' ')[1] || '',
        email: user?.email || '',
        phone: user?.phone || '',
        county: user?.county || 'Nairobi',
        town: user?.city || '',
        address: user?.address || '',
        landmark: ''
    });

    const [shippingMethod, setShippingMethod] = useState('standard');
    const [paymentMethod, setPaymentMethod] = useState('mpesa');

    const shippingCost = shippingMethod === 'standard' ? 400 : 100;
    const total = cartTotal + shippingCost;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setShippingData(prev => ({ ...prev, [name]: value }));
    };

    const handleNextStep = () => {
        if (currentStep === 1) {
            if (!shippingData.firstName || !shippingData.phone || !shippingData.address) {
                toast.error("Please fill in all required shipping details.");
                return;
            }
        }
        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const handlePrevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handlePlaceOrder = async () => {
        if (!user) {
            toast.error("You must be logged in to place an order.");
            return;
        }

        setIsProcessing(true);
        try {
            const orderData = {
                userId: user.uid,
                userName: `${shippingData.firstName} ${shippingData.lastName}`,
                userEmail: shippingData.email,
                items: cartItems,
                total: total,
                shippingAddress: `${shippingData.address}, ${shippingData.town}, ${shippingData.county}`,
                phone: shippingData.phone,
                paymentMethod: paymentMethod,
                paymentStatus: 'Unpaid' as const,
                shippingMethod: shippingMethod,
                shippingCost: shippingCost
            };

            const newOrder = await addOrder(orderData);

            if (paymentMethod === 'mpesa') {
                const loadingToast = toast.loading("Initiating M-Pesa prompt...");

                // 1. Trigger STK Push
                const response = await fetch('/api/payment/mpesa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phoneNumber: shippingData.phone,
                        amount: total
                    })
                });

                const data = await response.json();

                if (data.success) {
                    toast.success("Sent! Check your phone to pay.", { id: loadingToast });

                    // 2. Save CheckoutRequestID to Order
                    const orderRef = doc(db, 'orders', newOrder.id);
                    await updateDoc(orderRef, {
                        checkoutRequestId: data.checkoutRequestID
                    });

                    // 3. Listen for Payment Confirmation
                    const unsubscribe = onSnapshot(orderRef, (snapshot) => {
                        const updatedOrder = snapshot.data();
                        if (updatedOrder?.paymentStatus === 'Paid') {
                            toast.success("Payment Received!");
                            unsubscribe();
                            clearCart();
                            router.push(`/checkout/success?orderId=${newOrder.id}`);
                        } else if (updatedOrder?.paymentStatus === 'Failed') {
                            toast.error(`Payment Failed: ${updatedOrder.paymentFailureReason || 'Unknown error'}`);
                            unsubscribe();
                            setIsProcessing(false);
                        }
                    });

                    // Auto-timeout listener after 2 minutes
                    setTimeout(() => {
                        unsubscribe();
                        if (isProcessing) {
                            toast("Payment check timed out. Please check order status in dashboard.");
                            clearCart();
                            router.push(`/dashboard/user`); // Redirect anyway so they don't get stuck
                        }
                    }, 120000);

                    return; // Don't redirect immediately, wait for listener
                } else {
                    toast.error(data.message || "Failed to initiate M-Pesa.", { id: loadingToast });
                    setIsProcessing(false);
                    return;
                }
            }

            // Normal flow for non-MPesa
            clearCart();
            toast.success("Order placed successfully!");
            router.push(`/checkout/success?orderId=${newOrder.id}`);

        } catch (error) {
            console.error("Failed to place order:", error);
            toast.error("Failed to place order. Please try again.");
            setIsProcessing(false);
        }
    };

    const steps = [
        { id: 1, label: 'Shipping', icon: '📦' },
        { id: 2, label: 'Payment', icon: '💳' },
        { id: 3, label: 'Review', icon: '✓' }
    ];

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Breadcrumb */}
                    <div className="mb-8">
                        <nav className="flex items-center gap-2 text-sm text-gray-600">
                            <Link href="/cart" className="hover:text-melagro-primary transition-colors">Cart</Link>
                            <span className="text-gray-400">/</span>
                            <span className="text-melagro-primary font-semibold">Secure Checkout</span>
                        </nav>
                    </div>

                    {/* Step Indicators */}
                    <div className="mb-12">
                        <div className="flex items-center justify-between">
                            {steps.map((step, idx) => (
                                <div key={step.id} className="flex-1">
                                    <div className="flex items-center">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep >= step.id
                                            ? 'bg-melagro-primary text-white'
                                            : 'bg-gray-200 text-gray-500'
                                            }`}>
                                            {currentStep > step.id ? '✓' : step.id}
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <p className={`text-sm font-semibold transition-all ${currentStep >= step.id ? 'text-melagro-primary' : 'text-gray-500'
                                                }`}>
                                                {step.label}
                                            </p>
                                        </div>
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={`ml-5 mt-2 h-1 transition-all ${currentStep > step.id ? 'bg-melagro-primary' : 'bg-gray-200'
                                            }`}></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2">
                            {/* Step 1: Shipping */}
                            {currentStep === 1 && (
                                <div className="bg-white rounded-2xl p-8 border border-gray-200">
                                    <h2 className="text-2xl font-bold mb-8 text-gray-900">Contact Information</h2>

                                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-3">
                                        <span className="mt-0.5">ℹ️</span>
                                        <span>Already have an account? <Link href="#" className="font-semibold hover:underline">Log in</Link></span>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={shippingData.email}
                                                onChange={handleInputChange}
                                                placeholder="john@example.com"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                                            />
                                        </div>

                                        {/* Phone */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Phone Number (+254)</label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={shippingData.phone}
                                                onChange={handleInputChange}
                                                placeholder="748 970 757"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                                            />
                                            <p className="text-xs text-gray-500 mt-2">Used for delivery updates notify Prefer analytics</p>
                                        </div>

                                        <hr />

                                        <h3 className="text-lg font-bold text-gray-900">Shipping Address</h3>

                                        {/* Name */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-900 mb-2">First Name</label>
                                                <input
                                                    type="text"
                                                    name="firstName"
                                                    value={shippingData.firstName}
                                                    onChange={handleInputChange}
                                                    placeholder="John"
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-900 mb-2">Last Name</label>
                                                <input
                                                    type="text"
                                                    name="lastName"
                                                    value={shippingData.lastName}
                                                    onChange={handleInputChange}
                                                    placeholder="Doe"
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                                                />
                                            </div>
                                        </div>

                                        {/* County */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">County</label>
                                            <select
                                                name="county"
                                                value={shippingData.county}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                                            >
                                                <option>Nairobi</option>
                                                <option>Mombasa</option>
                                                <option>Kisumu</option>
                                                <option>Nakuru</option>
                                                <option>Eldoret</option>
                                            </select>
                                        </div>

                                        {/* Town */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Town / Estate / Area</label>
                                            <input
                                                type="text"
                                                name="town"
                                                value={shippingData.town}
                                                onChange={handleInputChange}
                                                placeholder="e.g. Westlands, Tuka Tusi, Langata"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                                            />
                                        </div>

                                        {/* Address */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Street Address / Nearest Landmark</label>
                                            <textarea
                                                name="address"
                                                value={shippingData.address}
                                                onChange={handleInputChange}
                                                placeholder="e.g. Rd. Hill-Rd. Station, Mid Avenue"
                                                rows={3}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                                            />
                                        </div>
                                    </div>

                                    {/* Shipping Method */}
                                    <div className="mt-8 pt-8 border-t">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Shipping Method</h3>
                                        <div className="space-y-3">
                                            <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${shippingMethod === 'standard'
                                                ? 'border-melagro-primary bg-melagro-primary/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="shipping"
                                                        value="standard"
                                                        checked={shippingMethod === 'standard'}
                                                        onChange={(e) => setShippingMethod(e.target.value)}
                                                        className="w-4 h-4 accent-melagro-primary"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900">Standard Delivery</p>
                                                        <p className="text-sm text-gray-500">Arrives in 1-3 business days</p>
                                                    </div>
                                                    <p className="font-bold text-melagro-primary">KES 400.00</p>
                                                </div>
                                            </label>

                                            <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${shippingMethod === 'pickup'
                                                ? 'border-melagro-primary bg-melagro-primary/5'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="shipping"
                                                        value="pickup"
                                                        checked={shippingMethod === 'pickup'}
                                                        onChange={(e) => setShippingMethod(e.target.value)}
                                                        className="w-4 h-4 accent-melagro-primary"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900">Pick-up Station</p>
                                                        <p className="text-sm text-gray-500">At our store location</p>
                                                    </div>
                                                    <p className="font-bold text-melagro-primary">KES 100.00</p>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* Navigation */}
                                    <div className="mt-8 flex justify-end">
                                        <button
                                            onClick={handleNextStep}
                                            className="bg-melagro-primary hover:bg-melagro-secondary text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                                        >
                                            Continue to Payment →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Payment */}
                            {currentStep === 2 && (
                                <div className="bg-white rounded-2xl p-8 border border-gray-200">
                                    <h2 className="text-2xl font-bold mb-8 text-gray-900">Payment Method</h2>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* M-Pesa Option */}
                                        <div
                                            onClick={() => setPaymentMethod('mpesa')}
                                            className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 ${paymentMethod === 'mpesa'
                                                ? 'border-[#22c55e] bg-green-50/50 shadow-sm ring-2 ring-[#22c55e]/20'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {paymentMethod === 'mpesa' && (
                                                <div className="absolute top-3 right-3 text-[#22c55e]">
                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                </div>
                                            )}
                                            <div className="mb-4">
                                                <span className="bg-[#22c55e] text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide">Recommended</span>
                                            </div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 border border-gray-100 shadow-sm">
                                                    <span className="font-black text-[#22c55e] tracking-tighter text-xs">M-PESA</span>
                                                </div>
                                                <span className="font-bold text-gray-900">M-Pesa Express</span>
                                            </div>
                                            <p className="text-sm text-gray-500 font-medium">Instant payment directly from your phone.</p>
                                        </div>

                                        {/* Card Option */}
                                        <div
                                            onClick={() => setPaymentMethod('card')}
                                            className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 ${paymentMethod === 'card'
                                                ? 'border-melagro-primary bg-blue-50/50 shadow-sm ring-2 ring-melagro-primary/20'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {paymentMethod === 'card' && (
                                                <div className="absolute top-3 right-3 text-melagro-primary">
                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                </div>
                                            )}
                                            <div className="mb-4 h-[22px]"></div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-100 shadow-sm text-gray-600">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                                </div>
                                                <span className="font-bold text-gray-900">Card Payment</span>
                                            </div>
                                            <p className="text-sm text-gray-500 font-medium">Visa, Mastercard, AMEX safely processed.</p>
                                        </div>

                                        {/* Cash on Delivery Option */}
                                        <div
                                            onClick={() => setPaymentMethod('cod')}
                                            className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 md:col-span-2 ${paymentMethod === 'cod'
                                                ? 'border-gray-800 bg-gray-100 shadow-sm ring-2 ring-gray-800/20'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {paymentMethod === 'cod' && (
                                                <div className="absolute top-3 right-3 text-gray-800">
                                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-100 shadow-sm text-gray-600">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                                </div>
                                                <span className="font-bold text-gray-900">Cash on Delivery</span>
                                            </div>
                                            <p className="text-sm text-gray-500 font-medium">Pay with cash or M-Pesa upon delivery/pickup.</p>
                                        </div>
                                    </div>

                                    {/* Selected Payment Details */}
                                    {/* Selected Payment Details */}
                                    <div className="mt-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {paymentMethod === 'mpesa' && (
                                            <div className="bg-[#f0f9f1] p-6 rounded-2xl border border-green-100">
                                                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                                                    <span className="text-xl">📱</span> Confirm M-Pesa Number
                                                </h3>
                                                <p className="text-sm text-gray-600 mb-4">
                                                    We will send an M-Pesa prompt to this number to complete your purchase.
                                                </p>
                                                <div className="flex gap-3">
                                                    <div className="bg-white px-4 py-3 border border-gray-200 rounded-xl font-bold text-gray-900 flex-grow max-w-xs flex items-center gap-3">
                                                        <span className="text-gray-400 font-medium">+254</span>
                                                        {shippingData.phone || 'Enter phone in Step 1'}
                                                    </div>
                                                    <button onClick={() => setCurrentStep(1)} className="text-sm font-bold text-[#22c55e] hover:underline px-4">Edit</button>
                                                </div>
                                            </div>
                                        )}

                                        {paymentMethod === 'card' && (
                                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                                                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                                                    <span className="text-xl">🔒</span> Secure Redirect
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    You will be redirected to our secure payment partner (Stripe) to complete your card transaction safely. We do not store your card details.
                                                </p>
                                            </div>
                                        )}

                                        {paymentMethod === 'cod' && (
                                            <div className="bg-gray-100 p-6 rounded-2xl border border-gray-200">
                                                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                                                    <span className="text-xl">🤝</span> Cash on Delivery
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    Pay when you receive your order or when you pick it up. Please have the exact amount ready or use M-Pesa on delivery.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8 flex gap-4">
                                        <button
                                            onClick={handlePrevStep}
                                            className="w-1/3 border-2 border-gray-100 text-gray-600 px-6 py-4 rounded-xl font-bold hover:bg-gray-50 hover:text-gray-900 transition-all text-sm uppercase tracking-wide"
                                        >
                                            ← Back
                                        </button>
                                        <button
                                            onClick={handleNextStep}
                                            className="flex-grow bg-[#22c55e] hover:bg-green-600 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-[#22c55e]/20 text-sm uppercase tracking-widest"
                                        >
                                            Review Order →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Review */}
                            {currentStep === 3 && (
                                <div className="bg-white rounded-2xl p-8 border border-gray-200">
                                    <h2 className="text-2xl font-bold mb-8 text-gray-900">Review Your Order</h2>

                                    <div className="space-y-8">
                                        {/* Shipping Address */}
                                        <div className="pb-8 border-b">
                                            <div className="flex items-start justify-between mb-4">
                                                <h3 className="font-bold text-gray-900">Shipping Address</h3>
                                                <button className="text-melagro-primary hover:underline text-sm font-semibold" onClick={() => setCurrentStep(1)}>Edit</button>
                                            </div>
                                            <p className="text-gray-900 font-semibold">{shippingData.firstName} {shippingData.lastName}</p>
                                            <p className="text-gray-600">{shippingData.address}</p>
                                            <p className="text-gray-600">P.O. Box 1234, Highland Farm</p>
                                            <p className="text-gray-600">{shippingData.town}, {shippingData.county}</p>
                                            <p className="text-gray-600">{shippingData.phone}</p>
                                        </div>

                                        {/* Shipping Method */}
                                        <div className="pb-8 border-b">
                                            <div className="flex items-start justify-between mb-4">
                                                <h3 className="font-bold text-gray-900">Shipping Method</h3>
                                                <button className="text-melagro-primary hover:underline text-sm font-semibold" onClick={() => setCurrentStep(1)}>Edit</button>
                                            </div>
                                            <p className="text-gray-900 font-semibold">Standard Delivery (Wells Fargo)</p>
                                            <p className="text-gray-600 text-sm">Estimated Delivery: 2-3 Business Days</p>
                                        </div>

                                        {/* Payment Method */}
                                        <div className="pb-8 border-b">
                                            <div className="flex items-start justify-between mb-4">
                                                <h3 className="font-bold text-gray-900">Payment Method</h3>
                                                <button className="text-melagro-primary hover:underline text-sm font-semibold" onClick={() => setCurrentStep(2)}>Edit</button>
                                            </div>
                                            <p className="text-gray-900 font-semibold uppercase">{paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod}</p>
                                            <p className="text-gray-600 text-sm">
                                                {paymentMethod === 'mpesa' && 'Paying via M-Pesa Express (Phone)'}
                                                {paymentMethod === 'card' && 'Paying via Secure Card (Stripe)'}
                                                {paymentMethod === 'cod' && 'Pay on Delivery / Collection'}
                                            </p>
                                        </div>

                                        {/* Order Items */}
                                        <div>
                                            <h3 className="font-bold text-gray-900 mb-4">Order Items ({cartItems.length})</h3>
                                            <div className="space-y-3">
                                                {cartItems.map(item => (
                                                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-gray-900">{item.name}</p>
                                                            <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                                                        </div>
                                                        <p className="font-bold text-gray-900">KES {(item.price * item.quantity).toLocaleString()}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex gap-4">
                                        <button
                                            onClick={handlePrevStep}
                                            disabled={isProcessing}
                                            className="flex-1 border-2 border-gray-300 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                                        >
                                            ← Back
                                        </button>
                                        <button
                                            onClick={handlePlaceOrder}
                                            disabled={isProcessing}
                                            className="flex-1 bg-melagro-primary hover:bg-melagro-secondary text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Processing...
                                                </>
                                            ) : (
                                                'Place Order'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Order Summary Sidebar */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-2xl p-6 border border-gray-200 sticky top-24 h-fit">
                                <h3 className="font-bold text-gray-900 mb-6 text-lg">Order Summary</h3>

                                <div className="space-y-3 mb-6 pb-6 border-b">
                                    {cartItems.map(item => (
                                        <div key={item.id} className="flex gap-3">
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-16 h-16 rounded object-cover bg-gray-100"
                                            />
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold text-gray-900 line-clamp-2">{item.name}</p>
                                                <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                                                <p className="text-sm font-bold text-melagro-primary mt-1">KES {(item.price * item.quantity).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal</span>
                                        <span className="font-semibold">KES {cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Shipping</span>
                                        <span className="font-semibold">KES {shippingCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Tax (16% VAT)</span>
                                        <span className="font-semibold">Included</span>
                                    </div>
                                    <div className="border-t pt-3 flex justify-between text-lg font-bold text-melagro-primary">
                                        <span>Total</span>
                                        <span>KES {total.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t space-y-3 text-xs">
                                    <div className="flex gap-2 items-start">
                                        <span className="text-lg">📱</span>
                                        <div>
                                            <p className="font-semibold text-gray-900">Need Help?</p>
                                            <p className="text-gray-500">Call our agricultural experts</p>
                                            <p className="text-melagro-primary font-semibold">+254 700 123 456</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
