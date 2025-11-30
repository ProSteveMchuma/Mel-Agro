"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useOrders } from "@/context/OrderContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

import { getDeliveryCost, KENYAN_COUNTIES, DELIVERY_ZONES } from "@/lib/delivery";
import { PaymentService } from "@/lib/payment";
import { NotificationService } from "@/lib/notifications";

export default function CheckoutPage() {
    const { isAuthenticated, user, isLoading: authLoading } = useAuth();
    const { cartItems, cartTotal, clearCart } = useCart();
    const { addOrder } = useOrders();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    // Wizard State
    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, name: "Shipping" },
        { id: 2, name: "Review" },
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

    const [paymentMethod, setPaymentMethod] = useState('mpesa');
    const [shippingCost, setShippingCost] = useState(getDeliveryCost('Nairobi'));
    const [showDeliveryChart, setShowDeliveryChart] = useState(false);

    const total = cartTotal + shippingCost;

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/auth/login?callbackUrl=/checkout');
        }
    }, [isAuthenticated, authLoading, router]);

    // Pre-fill user data
    useEffect(() => {
        if (user) {
            const names = user.name?.split(' ') || [];
            setFormData(prev => ({
                ...prev,
                firstName: names[0] || "",
                lastName: names.slice(1).join(' ') || "",
                phone: user.phone || "" // Assuming user object has phone
            }));
        }
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'county') {
            setShippingCost(getDeliveryCost(value));
        }
    };

    const validateStep = (step: number) => {
        if (step === 1) {
            if (!formData.firstName || !formData.lastName || !formData.phone || !formData.address || !formData.city) {
                alert("Please fill in all shipping details.");
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
        if (!user) return;
        setIsProcessing(true);

        try {
            // 1. Process Payment
            let paymentResult;
            if (paymentMethod === 'mpesa') {
                paymentResult = await PaymentService.initiateMpesaPayment(formData.phone, total);
            } else if (paymentMethod === 'card') {
                paymentResult = await PaymentService.processCardPayment({}, total);
            } else {
                paymentResult = { success: true, message: "Order placed. Payment on Delivery." };
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
                    details: `${formData.address}, ${formData.city}`
                }
            };

            await addOrder(orderData);

            // 3. Send Notifications
            await NotificationService.sendEmail(user.email || "", "Order Confirmation", "Your order has been placed.");
            await NotificationService.sendSMS(formData.phone, `Order placed successfully. Total: KES ${total}`);

            // 4. Clear Cart and Redirect
            clearCart();
            router.push("/checkout/success");

        } catch (error) {
            console.error("Order placement error:", error);
            alert("Failed to place order. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (authLoading || !isAuthenticated) return null;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
            <Header />

            <main className="flex-grow py-12">
                <div className="container-custom max-w-4xl">
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-8 text-center">Checkout</h1>

                    {/* Progress Steps */}
                    <div className="mb-12">
                        <div className="flex items-center justify-between relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                            <div className={`absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-melagro-primary -z-10 transition-all duration-500`} style={{ width: `${((currentStep - 1) / 2) * 100}%` }}></div>

                            {steps.map((step) => (
                                <div key={step.id} className="flex flex-col items-center bg-gray-50 px-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${step.id <= currentStep ? 'bg-melagro-primary text-white shadow-lg' : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {step.id < currentStep ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : step.id}
                                    </div>
                                    <span className={`mt-2 text-xs font-medium ${step.id <= currentStep ? 'text-melagro-primary' : 'text-gray-500'}`}>
                                        {step.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Step 1: Shipping Information */}
                        {currentStep === 1 && (
                            <div className="p-8 animate-in slide-in-from-right-4 duration-300">
                                <h2 className="text-xl font-bold mb-6">Shipping Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address</label>
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
                                </div>
                            </div>
                        )}

                        {/* Step 2: Review Order */}
                        {currentStep === 2 && (
                            <div className="p-8 animate-in slide-in-from-right-4 duration-300">
                                <h2 className="text-xl font-bold mb-6">Review Order</h2>
                                <div className="space-y-4 mb-8">
                                    {cartItems.map((item) => (
                                        <div key={item.id} className="flex gap-4 border-b border-gray-50 pb-4">
                                            <div className="w-16 h-16 bg-gray-100 rounded-lg relative overflow-hidden flex-shrink-0">
                                                {item.image ? (
                                                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Img</div>
                                                )}
                                            </div>
                                            <div className="flex-grow">
                                                <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                                                    <span className="text-sm font-bold text-gray-900">KES {(item.price * item.quantity).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl space-y-2">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal</span>
                                        <span>KES {cartTotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Shipping ({formData.county})</span>
                                        <span>KES {shippingCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                                        <span>Total</span>
                                        <span>KES {total.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Payment */}
                        {currentStep === 3 && (
                            <div className="p-8 animate-in slide-in-from-right-4 duration-300">
                                <h2 className="text-xl font-bold mb-6">Payment Method</h2>
                                <div className="space-y-4">
                                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'mpesa' ? 'border-melagro-primary bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="payment" value="mpesa" checked={paymentMethod === 'mpesa'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-melagro-primary focus:ring-melagro-primary" />
                                        <div className="ml-4 flex-grow">
                                            <span className="block font-bold text-gray-900">M-Pesa</span>
                                            <span className="block text-sm text-gray-500">Pay securely with your phone</span>
                                        </div>
                                        <div className="h-8 w-12 bg-white rounded flex items-center justify-center border border-gray-200 font-bold text-xs text-green-600">M-PESA</div>
                                    </label>

                                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-melagro-primary bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="payment" value="card" checked={paymentMethod === 'card'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-melagro-primary focus:ring-melagro-primary" />
                                        <div className="ml-4 flex-grow">
                                            <span className="block font-bold text-gray-900">Credit / Debit Card</span>
                                            <span className="block text-sm text-gray-500">Visa, Mastercard, American Express</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="h-8 w-12 bg-white rounded flex items-center justify-center border border-gray-200 font-bold text-xs text-blue-600">VISA</div>
                                        </div>
                                    </label>

                                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-melagro-primary bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-melagro-primary focus:ring-melagro-primary" />
                                        <div className="ml-4 flex-grow">
                                            <span className="block font-bold text-gray-900">Payment on Delivery</span>
                                            <span className="block text-sm text-gray-500">Pay when you receive your order</span>
                                        </div>
                                        <div className="h-8 w-12 bg-white rounded flex items-center justify-center border border-gray-200 font-bold text-xs text-gray-600">CASH</div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                            {currentStep > 1 ? (
                                <button onClick={prevStep} className="px-6 py-2 text-gray-600 font-medium hover:text-gray-900 transition-colors">
                                    Back
                                </button>
                            ) : (
                                <div></div> // Spacer
                            )}

                            {currentStep < 3 ? (
                                <button onClick={nextStep} className="btn-primary px-8 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                                    Next Step
                                </button>
                            ) : (
                                <button onClick={handlePlaceOrder} disabled={isProcessing} className="btn-primary px-8 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all flex items-center">
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
                </div>
            </main>

            <Footer />
        </div>
    );
}
