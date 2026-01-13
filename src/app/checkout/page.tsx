"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function CheckoutPage() {
    const router = useRouter();
    const { cartItems, cartTotal } = useCart();
    const { user } = useAuth();

    const [currentStep, setCurrentStep] = useState(1); // 1: Shipping, 2: Payment, 3: Review
    const [shippingData, setShippingData] = useState({
        firstName: user?.name?.split(' ')[0] || '',
        lastName: user?.name?.split(' ')[1] || '',
        email: user?.email || '',
        phone: '',
        county: 'Nairobi',
        town: '',
        address: '',
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
        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const handlePrevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
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
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                                            currentStep >= step.id
                                                ? 'bg-melagro-primary text-white'
                                                : 'bg-gray-200 text-gray-500'
                                        }`}>
                                            {currentStep > step.id ? '✓' : step.id}
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <p className={`text-sm font-semibold transition-all ${
                                                currentStep >= step.id ? 'text-melagro-primary' : 'text-gray-500'
                                            }`}>
                                                {step.label}
                                            </p>
                                        </div>
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={`ml-5 mt-2 h-1 transition-all ${
                                            currentStep > step.id ? 'bg-melagro-primary' : 'bg-gray-200'
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
                                            </select>
                                        </div>

                                        {/* Town */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Town / Estate / Area</label>
                                            <input
                                                type="text"
                                                name="town"
                                                placeholder="e.g. Westlands, Tuka Tusi, Langata"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-melagro-primary/50"
                                            />
                                        </div>

                                        {/* Address */}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-900 mb-2">Street Address / Nearest Landmark</label>
                                            <textarea
                                                name="address"
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
                                            <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                shippingMethod === 'standard'
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

                                            <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                                shippingMethod === 'pickup'
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

                                    <div className="space-y-3">
                                        <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            paymentMethod === 'mpesa'
                                                ? 'border-melagro-primary bg-melagro-primary/5'
                                                : 'border-gray-200'
                                        }`}>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    value="mpesa"
                                                    checked={paymentMethod === 'mpesa'}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="w-4 h-4 accent-melagro-primary"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900">M-Pesa</p>
                                                    <p className="text-sm text-gray-500">Pay using your phone number</p>
                                                </div>
                                            </div>
                                        </label>

                                        <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            paymentMethod === 'card'
                                                ? 'border-melagro-primary bg-melagro-primary/5'
                                                : 'border-gray-200'
                                        }`}>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="radio"
                                                    value="card"
                                                    checked={paymentMethod === 'card'}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                    className="w-4 h-4 accent-melagro-primary"
                                                />
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900">Card Payment</p>
                                                    <p className="text-sm text-gray-500">Visa, Mastercard, American Express</p>
                                                </div>
                                            </div>
                                        </label>
                                    </div>

                                    {paymentMethod === 'mpesa' && (
                                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <p className="text-sm text-green-800">
                                                <strong>How to pay:</strong> You'll receive a prompt on your phone. Enter your M-Pesa PIN to complete the payment.
                                            </p>
                                        </div>
                                    )}

                                    <div className="mt-8 flex gap-4">
                                        <button
                                            onClick={handlePrevStep}
                                            className="flex-1 border-2 border-gray-300 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                                        >
                                            ← Back
                                        </button>
                                        <button
                                            onClick={handleNextStep}
                                            className="flex-1 bg-melagro-primary hover:bg-melagro-secondary text-white px-6 py-3 rounded-lg font-semibold transition-colors"
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
                                            <p className="text-gray-600">Nairobi, KE-Valley</p>
                                            <p className="text-gray-600">+254 712 345 678</p>
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
                                            <p className="text-gray-900 font-semibold">M-Pesa</p>
                                            <p className="text-gray-600 text-sm">Phone number ending in "***"</p>
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
                                            className="flex-1 border-2 border-gray-300 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                                        >
                                            ← Back
                                        </button>
                                        <button
                                            onClick={() => router.push('/checkout/success')}
                                            className="flex-1 bg-melagro-primary hover:bg-melagro-secondary text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                                        >
                                            Place Order
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
