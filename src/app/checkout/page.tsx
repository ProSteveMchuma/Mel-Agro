"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useOrders } from "@/context/OrderContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getDeliveryCost, KENYAN_COUNTIES, DELIVERY_ZONES } from "@/lib/delivery";
import { PaymentService } from "@/lib/payment";
import { NotificationService } from "@/lib/notifications";
import OrderSummary from "@/components/checkout/OrderSummary";

export default function CheckoutPage() {
    const { isAuthenticated, user, isLoading: authLoading } = useAuth();
    const { cartItems, cartTotal, clearCart } = useCart();
    const { addOrder } = useOrders();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, name: "Address" },
        { id: 2, name: "Shipping" },
        { id: 3, name: "Payment" }
    ];

    // Form State
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        address: "",
        city: "",
        county: "Nairobi"
    });

    const [notificationPreferences, setNotificationPreferences] = useState<string[]>(['email', 'sms']);
    const [paymentMethod, setPaymentMethod] = useState('mpesa');
    const [shippingMethod, setShippingMethod] = useState('delivery'); // 'collection', 'delivery', 'custom'
    const [shippingCost, setShippingCost] = useState(getDeliveryCost('Nairobi'));

    const total = cartTotal + shippingCost;

    // Pre-fill user data
    useEffect(() => {
        if (user) {
            const names = user.name?.split(' ') || [];
            setFormData(prev => ({
                ...prev,
                firstName: names[0] || "",
                lastName: names.slice(1).join(' ') || "",
                phone: user.phone || ""
            }));
        }
    }, [user]);

    // Update shipping cost when method or county changes
    useEffect(() => {
        if (shippingMethod === 'collection') {
            setShippingCost(0);
        } else if (shippingMethod === 'delivery') {
            setShippingCost(getDeliveryCost(formData.county));
        } else {
            setShippingCost(0); // Custom shipping TBD
        }
    }, [shippingMethod, formData.county]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNotificationChange = (channel: string) => {
        setNotificationPreferences(prev =>
            prev.includes(channel)
                ? prev.filter(p => p !== channel)
                : [...prev, channel]
        );
    };

    const validateStep = (step: number) => {
        if (step === 1) {
            if (!formData.firstName || !formData.lastName || !formData.phone || !formData.address || !formData.city) {
                alert("Please fill in all address details.");
                return false;
            }
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, 3));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handlePlaceOrder = async () => {
        if (!user) {
            router.push('/auth/login?callbackUrl=/checkout');
            return;
        }
        setIsProcessing(true);

        try {
            // 1. Process Payment (if applicable)
            let paymentResult = { success: true, message: "" };
            if (paymentMethod === 'mpesa') {
                paymentResult = await PaymentService.initiateMpesaPayment(formData.phone, total);
            } else if (paymentMethod === 'card') {
                paymentResult = await PaymentService.processCardPayment({}, total);
            }

            if (!paymentResult.success) {
                alert("Payment failed: " + paymentResult.message);
                setIsProcessing(false);
                return;
            }

            // 2. Create Order
            const orderData = {
                userId: user.uid,
                userEmail: user.email || "",
                items: cartItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image
                })),
                total: total,
                shippingCost: shippingCost,
                paymentMethod: paymentMethod,
                shippingAddress: {
                    county: formData.county,
                    details: `${formData.address}, ${formData.city}`,
                    method: shippingMethod
                },
                status: paymentMethod === 'cod' ? 'Pending' : 'Processing',
                paymentStatus: (paymentMethod === 'cod' ? 'Unpaid' : 'Paid') as 'Paid' | 'Unpaid',
                notificationPreferences: notificationPreferences
            };

            const newOrder = await addOrder(orderData);

            // 3. Send Notifications (using preferences)
            await NotificationService.notify(
                notificationPreferences,
                { email: user.email || "", phone: formData.phone },
                {
                    subject: "Order Confirmation",
                    emailBody: "Your order has been placed successfully.",
                    smsBody: `Order #${newOrder.id.substr(0, 5)} placed. Total: KES ${total}`
                }
            );

            // 4. Clear Cart and Redirect
            clearCart();
            router.push(`/checkout/success?orderId=${newOrder.id}`);

        } catch (error) {
            console.error("Order placement error:", error);
            alert("Failed to place order. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (authLoading) return null;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow py-8 lg:py-12">
                <div className="container-custom">
                    <h1 className="text-3xl font-extrabold text-melagro-primary mb-8">Checkout</h1>

                    {/* Progress Steps */}
                    <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between relative max-w-2xl mx-auto">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10"></div>
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-melagro-primary -z-10 transition-all duration-500`} style={{ width: `${((currentStep - 1) / 2) * 100}%` }}></div>

                            {steps.map((step) => (
                                <div key={step.id} className="flex flex-col items-center bg-white px-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${step.id <= currentStep ? 'bg-melagro-primary text-white' : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {step.id < currentStep ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : step.id}
                                    </div>
                                    <span className={`mt-2 text-xs font-bold ${step.id <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {step.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Main Content Column */}
                        <div className="lg:w-2/3 space-y-6">

                            {/* Step 1: Address */}
                            {currentStep === 1 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold text-melagro-primary flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            Shipping Address
                                        </h2>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-xl mb-6 flex gap-4">
                                        <button className="flex-1 bg-white shadow-sm py-2 px-4 rounded-lg text-sm font-bold text-gray-900 border border-gray-200">Use Existing Address</button>
                                        <button className="flex-1 py-2 px-4 rounded-lg text-sm font-medium text-gray-500 hover:bg-white hover:shadow-sm transition-all">Add New Address</button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                            <input name="firstName" value={formData.firstName} onChange={handleInputChange} type="text" className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                            <input name="lastName" value={formData.lastName} onChange={handleInputChange} type="text" className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                            <input name="phone" value={formData.phone} onChange={handleInputChange} type="tel" placeholder="07..." className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                            <input name="address" value={formData.address} onChange={handleInputChange} type="text" placeholder="Street, Building, etc." className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">City/Town</label>
                                            <input name="city" value={formData.city} onChange={handleInputChange} type="text" className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                                            <select name="county" value={formData.county} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary">
                                                {KENYAN_COUNTIES.map(county => (
                                                    <option key={county} value={county}>{county}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Notification Preferences */}
                                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                                            <label className="block text-sm font-medium text-gray-700 mb-3">Notification Preferences</label>
                                            <div className="flex gap-6">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={notificationPreferences.includes('email')}
                                                        onChange={() => handleNotificationChange('email')}
                                                        className="rounded text-melagro-primary focus:ring-melagro-primary"
                                                    />
                                                    <span className="text-sm text-gray-600">Email</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={notificationPreferences.includes('sms')}
                                                        onChange={() => handleNotificationChange('sms')}
                                                        className="rounded text-melagro-primary focus:ring-melagro-primary"
                                                    />
                                                    <span className="text-sm text-gray-600">SMS</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={notificationPreferences.includes('whatsapp')}
                                                        onChange={() => handleNotificationChange('whatsapp')}
                                                        className="rounded text-melagro-primary focus:ring-melagro-primary"
                                                    />
                                                    <span className="text-sm text-gray-600">WhatsApp</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Step 2: Shipping Method */}
                            {currentStep === 2 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-xl font-bold text-melagro-primary mb-6 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                        Shipping Method
                                    </h2>

                                    <div className="space-y-4">
                                        <label className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${shippingMethod === 'collection' ? 'border-melagro-primary bg-green-50 ring-1 ring-melagro-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                                            <input type="radio" name="shipping" value="collection" checked={shippingMethod === 'collection'} onChange={(e) => setShippingMethod(e.target.value)} className="mt-1 text-melagro-primary focus:ring-melagro-primary" />
                                            <div className="ml-4 flex-grow">
                                                <div className="flex justify-between">
                                                    <span className="block font-bold text-gray-900">Self Collection</span>
                                                    <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">FREE</span>
                                                </div>
                                                <span className="block text-sm text-gray-500 mt-1">Collect from our nearest shop. Ready in 2 hours.</span>
                                            </div>
                                        </label>

                                        <label className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${shippingMethod === 'delivery' ? 'border-melagro-primary bg-green-50 ring-1 ring-melagro-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                                            <input type="radio" name="shipping" value="delivery" checked={shippingMethod === 'delivery'} onChange={(e) => setShippingMethod(e.target.value)} className="mt-1 text-melagro-primary focus:ring-melagro-primary" />
                                            <div className="ml-4 flex-grow">
                                                <div className="flex justify-between">
                                                    <span className="block font-bold text-gray-900">Standard Delivery</span>
                                                    <span className="font-bold text-gray-900">KES {getDeliveryCost(formData.county).toLocaleString()}</span>
                                                </div>
                                                <span className="block text-sm text-gray-500 mt-1">Delivery to {formData.county} Region. 24-72 hours.</span>
                                            </div>
                                        </label>

                                        <label className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${shippingMethod === 'custom' ? 'border-melagro-primary bg-green-50 ring-1 ring-melagro-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                                            <input type="radio" name="shipping" value="custom" checked={shippingMethod === 'custom'} onChange={(e) => setShippingMethod(e.target.value)} className="mt-1 text-melagro-primary focus:ring-melagro-primary" />
                                            <div className="ml-4 flex-grow">
                                                <div className="flex justify-between">
                                                    <span className="block font-bold text-gray-900">Custom Shipping</span>
                                                    <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">CUSTOM</span>
                                                </div>
                                                <span className="block text-sm text-gray-500 mt-1">International or special arrangements. Cost TBD.</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Payment */}
                            {currentStep === 3 && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-xl font-bold text-melagro-primary mb-6 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                        Payment Method
                                    </h2>

                                    <div className="space-y-4 mb-6">
                                        <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'mpesa' ? 'border-melagro-primary bg-green-50 ring-1 ring-melagro-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                                            <input type="radio" name="payment" value="mpesa" checked={paymentMethod === 'mpesa'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-melagro-primary focus:ring-melagro-primary" />
                                            <div className="ml-4 flex-grow">
                                                <span className="block font-bold text-gray-900">M-Pesa</span>
                                                <span className="block text-sm text-gray-500">Pay securely with your phone</span>
                                            </div>
                                            <div className="h-8 px-2 bg-white rounded flex items-center justify-center border border-gray-200 font-bold text-xs text-green-600">M-PESA</div>
                                        </label>

                                        <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-melagro-primary bg-green-50 ring-1 ring-melagro-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                                            <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-melagro-primary focus:ring-melagro-primary" />
                                            <div className="ml-4 flex-grow">
                                                <span className="block font-bold text-gray-900">Credit / Debit Card</span>
                                                <span className="block text-sm text-gray-500">Visa, Mastercard, American Express</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="h-8 px-2 bg-white rounded flex items-center justify-center border border-gray-200 font-bold text-xs text-blue-600">VISA</div>
                                            </div>
                                        </label>

                                        <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-melagro-primary bg-green-50 ring-1 ring-melagro-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                                            <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-melagro-primary focus:ring-melagro-primary" />
                                            <div className="ml-4 flex-grow">
                                                <span className="block font-bold text-gray-900">Cash on Delivery</span>
                                                <span className="block text-sm text-gray-500">Pay when you receive your order</span>
                                            </div>
                                            <div className="h-8 px-2 bg-white rounded flex items-center justify-center border border-gray-200 font-bold text-xs text-gray-600">CASH</div>
                                        </label>
                                    </div>

                                    {paymentMethod === 'cod' && (
                                        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex gap-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            <div>
                                                <h4 className="font-bold text-yellow-800 text-sm">Cash on Delivery Note</h4>
                                                <p className="text-sm text-yellow-700 mt-1">Please have the exact amount ready as you pick up your order. We may not be able to provide change for large amounts.</p>
                                                <p className="text-sm text-yellow-700 mt-1 font-medium">Questions about payment? Call us at +254 728 400 331</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between items-center pt-4">
                                {currentStep > 1 ? (
                                    <button onClick={prevStep} className="px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                        Back to {steps[currentStep - 2].name}
                                    </button>
                                ) : (
                                    <div></div>
                                )}

                                {currentStep < 3 ? (
                                    <button onClick={nextStep} className="btn-primary px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center gap-2">
                                        Continue to {steps[currentStep].name}
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                ) : (
                                    <button onClick={handlePlaceOrder} disabled={isProcessing} className="btn-primary px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center gap-2">
                                        {isProcessing ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </>
                                        ) : (
                                            `Pay KES ${total.toLocaleString()}`
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Sidebar Column */}
                        <div className="lg:w-1/3">
                            <OrderSummary shippingCost={shippingCost} shippingCounty={formData.county} />
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
