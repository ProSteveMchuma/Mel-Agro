"use client";

import { useState, useEffect } from 'react';
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
import { generateWhatsAppMessage, getWhatsAppUrl } from '@/lib/whatsapp';
import { useBehavior } from '@/context/BehaviorContext';
import { getMpesaErrorMessage } from '@/lib/mpesa';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { getDeliveryCost } from '@/lib/delivery';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { checkoutSchema, CheckoutFormData } from '@/lib/schemas';
import { Input } from '@/components/ui/form/Input';
import { Select } from '@/components/ui/form/Select';
import { Textarea } from '@/components/ui/form/Textarea';

const LocationPicker = dynamic(() => import('../../components/checkout/LocationPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">Loading Map...</div>
});

const KENYA_COUNTIES = [
    // List of major counties or all 47 ideally, kept short for brevity but can be expanded
    { value: 'Nairobi', label: 'Nairobi' },
    { value: 'Mombasa', label: 'Mombasa' },
    { value: 'Kisumu', label: 'Kisumu' },
    { value: 'Nakuru', label: 'Nakuru' },
    { value: 'Eldoret', label: 'Eldoret' },
    { value: 'Kiambu', label: 'Kiambu' },
    { value: 'Machakos', label: 'Machakos' },
    { value: 'Kajiado', label: 'Kajiado' },
    { value: 'Kilifi', label: 'Kilifi' },
    { value: 'Meru', label: 'Meru' },
    { value: 'Nyeri', label: 'Nyeri' },
];

export default function CheckoutPage() {
    const router = useRouter();
    const { cartItems, cartTotal, clearCart } = useCart();
    const { user } = useAuth();
    const { addOrder } = useOrders();
    const { trackAction } = useBehavior();

    const [currentStep, setCurrentStep] = useState(1); // 1: Shipping, 2: Payment, 3: Review
    const [isProcessing, setIsProcessing] = useState(false);
    const [usePoints, setUsePoints] = useState(false);

    // Initialize React Hook Form
    const methods = useForm<CheckoutFormData>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            shipping: {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                county: 'Nairobi',
                town: '',
                address: '',
                lat: -1.2921,
                lng: 36.8219
            },
            shippingMethod: 'standard',
            paymentMethod: 'mpesa'
        },
        mode: 'onChange'
    });

    const { watch, setValue, trigger, handleSubmit, reset } = methods;
    const shippingData = watch('shipping');
    const shippingMethod = watch('shippingMethod');
    const paymentMethod = watch('paymentMethod');

    // Sync shipping data with user profile when user loads
    useEffect(() => {
        if (user) {
            reset({
                shipping: {
                    firstName: user.name?.split(' ')[0] || '',
                    lastName: user.name?.split(' ')[1] || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    county: user.county || 'Nairobi',
                    town: user.city || '',
                    address: user.address || '',
                    lat: -1.2921, // Could check if user has saved loc
                    lng: 36.8219
                },
                shippingMethod: 'standard',
                paymentMethod: 'mpesa'
            });
        }
    }, [user, reset]);

    // Calculate dynamic shipping
    const deliveryInfo = getDeliveryCost(shippingData.county, cartTotal);
    const shippingCost = shippingMethod === 'standard' ? deliveryInfo.cost : 100;

    const discountFromPoints = usePoints ? Math.min(cartTotal, user?.loyaltyPoints || 0) : 0;
    const total = cartTotal + shippingCost - discountFromPoints;

    const handleNextStep = async () => {
        if (currentStep === 1) {
            const isValid = await trigger('shipping');
            if (!isValid) {
                toast.error("Please fill in all required shipping details.");
                trackAction('checkout_validation_frustration', { errors: ['missing_fields'] });
                return;
            }
        }

        trackAction('checkout_step', { step: currentStep === 1 ? 'payment' : 'review' });
        trackAction('checkout_step_advance', { from: currentStep, to: currentStep + 1 });
        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const handlePrevStep = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const onSubmit = async (data: CheckoutFormData) => {
        if (!user) {
            toast.error("Please sign in to complete your order.");
            // Smart Redirect: Save current path as callback
            router.push(`/auth/login?callbackUrl=/checkout`);
            return;
        }

        setIsProcessing(true);
        try {
            // Helper to remove undefined values recursively
            const cleanObject = (obj: any): any => {
                if (Array.isArray(obj)) return obj.map(cleanObject);
                if (obj !== null && typeof obj === 'object') {
                    return Object.entries(obj)
                        .filter(([_, v]) => v !== undefined)
                        .reduce((acc, [k, v]) => ({ ...acc, [k]: cleanObject(v) }), {});
                }
                return obj;
            };

            const orderData = cleanObject({
                userId: user.uid,
                userName: `${data.shipping.firstName} ${data.shipping.lastName}`.trim(),
                userEmail: data.shipping.email,
                items: cartItems.map(item => ({
                    id: item.id,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image || null,
                    selectedVariant: item.selectedVariant || null
                })),
                subtotal: cartTotal,
                discountAmount: discountFromPoints,
                total: total,
                shippingAddress: {
                    county: data.shipping.county,
                    details: `${data.shipping.address}, ${data.shipping.town}`,
                    method: data.shippingMethod,
                    lat: data.shipping.lat,
                    lng: data.shipping.lng
                },
                phone: data.shipping.phone,
                paymentMethod: data.paymentMethod === 'whatsapp' ? 'WhatsApp Order' :
                    (data.paymentMethod === 'cod' ? 'Cash on Delivery' :
                        (data.paymentMethod === 'manual_mpesa' ? `M-Pesa Paybill (${data.transactionCode})` : 'M-Pesa')),
                paymentStatus: data.paymentMethod === 'whatsapp' ? 'Pending WhatsApp' :
                    (data.paymentMethod === 'manual_mpesa' ? 'Pending Verification' : 'Unpaid'),
                shippingMethod: data.shippingMethod,
                shippingCost: shippingCost,
                notificationPreferences: ['sms', 'email']
            });

            const newOrder = await addOrder(orderData, discountFromPoints);

            // Mark cart as converted for analytics
            await updateDoc(doc(db, 'carts', user.uid), {
                status: 'converted',
                convertedAt: new Date().toISOString(),
                lastOrderId: newOrder.id
            }).catch(() => { });

            if (data.paymentMethod === 'whatsapp') {
                const message = generateWhatsAppMessage({
                    orderId: newOrder.id,
                    items: cartItems.map(item => ({
                        name: item.selectedVariant ? `${item.name} (${item.selectedVariant.name})` : item.name,
                        quantity: item.quantity,
                        price: item.price
                    })),
                    total: total,
                    userName: `${data.shipping.firstName} ${data.shipping.lastName}`,
                    phone: data.shipping.phone,
                    address: `${data.shipping.address}, ${data.shipping.town}, ${data.shipping.county}`
                });

                const whatsappUrl = getWhatsAppUrl(message);
                clearCart();
                toast.success("Order recorded! Redirecting to WhatsApp...");
                setTimeout(() => {
                    window.open(whatsappUrl, '_blank');
                    router.push(`/checkout/success?orderId=${newOrder.id}`);
                }, 2000);
                return;
            }

            if (data.paymentMethod === 'mpesa') {

                const loadingToast = toast.loading("Initiating M-Pesa prompt...");

                // 1. Trigger STK Push
                const response = await fetch('/api/payment/mpesa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phoneNumber: data.shipping.phone,
                        amount: total
                    })
                });

                const resData = await response.json();

                if (resData.success) {
                    toast.success("Sent! Check your phone to pay.", { id: loadingToast });

                    // 2. Save CheckoutRequestID to Order
                    const orderRef = doc(db, 'orders', newOrder.id);
                    await updateDoc(orderRef, {
                        checkoutRequestId: resData.checkoutRequestID
                    });

                    // 3. Listen for Payment Confirmation
                    const unsubscribe = onSnapshot(orderRef, (snapshot) => {
                        const updatedOrder = snapshot.data();
                        if (updatedOrder?.paymentStatus === 'Paid') {
                            toast.success("Payment Received! Order #" + newOrder.id.slice(0, 5));
                            unsubscribe();
                            clearCart();
                            router.push(`/checkout/success?orderId=${newOrder.id}`);
                        } else if (updatedOrder?.paymentStatus === 'Failed') {
                            const errorMsg = getMpesaErrorMessage(updatedOrder.paymentFailureReason || 'Unknown');
                            toast.error(`Payment Failed: ${errorMsg}`, { duration: 6000 });
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
                            router.push(`/dashboard/user`);
                        }
                    }, 120000);

                    return;
                } else {
                    toast.error(resData.message || "Failed to initiate M-Pesa.", { id: loadingToast });
                    setIsProcessing(false);
                    return;
                }
            }

            if (data.paymentMethod === 'card') {
                const loadingToast = toast.loading("Preparing secure checkout...");
                const response = await fetch('/api/payment/paystack/initialize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: cartItems,
                        orderId: newOrder.id,
                        email: data.shipping.email,
                        amount: total
                    })
                });

                const resData = await response.json();
                if (resData.success && resData.url) {
                    toast.success("Redirecting to secure payment...", { id: loadingToast });
                    clearCart();
                    window.location.href = resData.url;
                    return;
                } else {
                    toast.error(resData.message || "Failed to initiate card payment.", { id: loadingToast });
                    setIsProcessing(false);
                    return;
                }
            }

            // Normal flow for COD
            trackAction('checkout_complete', { orderId: newOrder.id });
            clearCart();
            toast.success("Order placed successfully!");
            router.push(`/checkout/success?orderId=${newOrder.id}`);

        } catch (error: any) {
            console.error("Order Failure Details:", error);
            toast.error("Failed to place order. " + (error.message || "Please try again."));
            setIsProcessing(false);
        }
    };

    const steps = [
        { id: 1, label: 'Shipping', icon: '📦' },
        { id: 2, label: 'Payment', icon: '💳' },
        { id: 3, label: 'Review', icon: '✓' }
    ];

    return (
        <FormProvider {...methods}>
            <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
                <link
                    rel="stylesheet"
                    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                    crossOrigin=""
                />
                <Header />

                <main className="flex-grow py-8 px-4">
                    <div className="max-w-6xl mx-auto">
                        {/* Breadcrumb */}
                        <div className="mb-8">
                            <nav className="flex items-center gap-2 text-sm text-gray-600">
                                <Link href="/cart" className="hover:text-melagri-primary transition-colors">Cart</Link>
                                <span className="text-gray-400">/</span>
                                <span className="text-melagri-primary font-semibold">Secure Checkout</span>
                            </nav>
                        </div>

                        {/* Step Indicators */}
                        <div className="mb-12">
                            <div className="flex items-center justify-between">
                                {steps.map((step, idx) => (
                                    <div key={step.id} className="flex-1">
                                        <div className="flex items-center">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep >= step.id
                                                ? 'bg-melagri-primary text-white'
                                                : 'bg-gray-200 text-gray-500'
                                                }`}>
                                                {currentStep > step.id ? '✓' : step.id}
                                            </div>
                                            <div className="ml-3 flex-1">
                                                <p className={`text-sm font-semibold transition-all ${currentStep >= step.id ? 'text-melagri-primary' : 'text-gray-500'
                                                    }`}>
                                                    {step.label}
                                                </p>
                                            </div>
                                        </div>
                                        {idx < steps.length - 1 && (
                                            <div className={`ml-5 mt-2 h-1 transition-all ${currentStep > step.id ? 'bg-melagri-primary' : 'bg-gray-200'
                                                }`}></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="lg:col-span-2 relative">
                                <AnimatePresence mode="wait">
                                    {/* Step 1: Shipping */}
                                    {currentStep === 1 && (
                                        <motion.div
                                            key="step1"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm"
                                        >
                                            <h2 className="text-2xl font-bold mb-8 text-gray-900">Contact Information</h2>

                                            {user?.savedAddresses && user.savedAddresses.length > 0 && (
                                                <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Quick Select: Saved Addresses</p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {user.savedAddresses.map(addr => (
                                                            <button
                                                                type="button"
                                                                key={addr.id}
                                                                onClick={() => {
                                                                    setValue('shipping.county', addr.county);
                                                                    setValue('shipping.town', addr.city);
                                                                    setValue('shipping.address', addr.details);
                                                                    toast.success(`Loaded "${addr.label}"`);
                                                                }}
                                                                className="text-left p-3 bg-white rounded-xl border border-gray-100 hover:border-melagri-primary hover:shadow-md transition-all group"
                                                            >
                                                                <p className="font-bold text-gray-900 text-sm group-hover:text-melagri-primary">{addr.label}</p>
                                                                <p className="text-[10px] text-gray-400 line-clamp-1">{addr.details}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-6">
                                                <Input
                                                    name="shipping.email"
                                                    type="email"
                                                    label="Email Address"
                                                    placeholder="john@example.com"
                                                />
                                                <Input
                                                    name="shipping.phone"
                                                    type="tel"
                                                    label="Phone Number (+254)"
                                                    placeholder="0712 345 678"
                                                    format="phone"
                                                />

                                                <hr />

                                                <h3 className="text-lg font-bold text-gray-900">Shipping Address</h3>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <Input name="shipping.firstName" label="First Name" placeholder="John" />
                                                    <Input name="shipping.lastName" label="Last Name" placeholder="Doe" />
                                                </div>

                                                <Select
                                                    name="shipping.county"
                                                    label="County"
                                                    options={KENYA_COUNTIES}
                                                />

                                                <Input
                                                    name="shipping.town"
                                                    label="Town / Estate / Area"
                                                    placeholder="e.g. Westlands, Kilimani"
                                                />

                                                <Textarea
                                                    name="shipping.address"
                                                    label="Street Address / Nearest Landmark"
                                                    placeholder="e.g. Apartment, Building, Floor"
                                                    rows={3}
                                                />

                                                {/* Map Location Picker */}
                                                <div className="mt-6">
                                                    <label className="block text-sm font-semibold text-gray-900 mb-4">Pin Your Exact Delivery Location</label>
                                                    <LocationPicker
                                                        onLocationSelect={(lat, lng, address) => {
                                                            setValue('shipping.lat', lat);
                                                            setValue('shipping.lng', lng);
                                                            if (address?.county) setValue('shipping.county', address.county);
                                                            if (address?.town) setValue('shipping.town', address.town);

                                                            if (address?.county) {
                                                                toast.success(`Location detected: ${address.county}`, { id: 'map-toast' });
                                                            } else {
                                                                toast.success("Location pinned!", { id: 'map-toast' });
                                                            }
                                                        }}
                                                        initialLat={shippingData.lat}
                                                        initialLng={shippingData.lng}
                                                    />
                                                    <p className="text-[10px] text-gray-400 mt-2 italic">Drag the marker to your precise location for faster delivery.</p>
                                                </div>
                                            </div>

                                            {/* Shipping Method */}
                                            <div className="mt-8 pt-8 border-t">
                                                <h3 className="text-lg font-bold text-gray-900 mb-4">Shipping Method</h3>
                                                <div className="space-y-3">
                                                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${shippingMethod === 'standard'
                                                        ? 'border-melagri-primary bg-melagri-primary/5'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="radio"
                                                                {...methods.register('shippingMethod')}
                                                                value="standard"
                                                                className="w-4 h-4 accent-melagri-primary"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-gray-900">Standard Delivery</p>
                                                                <p className="text-sm text-gray-500">Arrives in 1-3 business days</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-melagri-primary">
                                                                    {shippingCost === 0 ? "FREE" : `KES ${shippingCost.toLocaleString()}`}
                                                                </p>
                                                                {shippingMethod === 'standard' && (
                                                                    <p className="text-[10px] text-gray-400 font-medium">({deliveryInfo.reason})</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </label>

                                                    <label className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${shippingMethod === 'pickup'
                                                        ? 'border-melagri-primary bg-melagri-primary/5'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                        }`}>
                                                        <div className="flex items-center gap-3">
                                                            <input
                                                                type="radio"
                                                                {...methods.register('shippingMethod')}
                                                                value="pickup"
                                                                className="w-4 h-4 accent-melagri-primary"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-gray-900">Pick-up Station</p>
                                                                <p className="text-sm text-gray-500">At our store location</p>
                                                            </div>
                                                            <p className="font-bold text-melagri-primary">KES 100.00</p>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Navigation */}
                                            <div className="mt-8 flex justify-end">
                                                <button
                                                    onClick={handleNextStep}
                                                    type="button"
                                                    className="bg-melagri-primary hover:bg-melagri-secondary text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                                                >
                                                    Continue to Payment →
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Step 2: Payment */}
                                    {currentStep === 2 && (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm"
                                        >
                                            <h2 className="text-2xl font-bold mb-8 text-gray-900">Payment Method</h2>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* M-Pesa Option */}
                                                <div
                                                    onClick={() => setValue('paymentMethod', 'mpesa')}
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

                                                {/* M-Pesa Manual (Paybill) */}
                                                <div
                                                    onClick={() => setValue('paymentMethod', 'manual_mpesa')}
                                                    className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 ${paymentMethod === 'manual_mpesa'
                                                        ? 'border-[#22c55e] bg-green-50/50 shadow-sm ring-2 ring-[#22c55e]/20'
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {paymentMethod === 'manual_mpesa' && (
                                                        <div className="absolute top-3 right-3 text-[#22c55e]">
                                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                        </div>
                                                    )}
                                                    <div className="mb-4 h-[22px]"></div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 border border-gray-100 shadow-sm text-green-600 font-black text-xs">
                                                            P
                                                        </div>
                                                        <span className="font-bold text-gray-900">Paybill / Till</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 font-medium">Pay manually via M-Pesa Menu.</p>
                                                </div>

                                                {/* WhatsApp Order Option */}
                                                <div
                                                    onClick={() => setValue('paymentMethod', 'whatsapp')}
                                                    className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 ${paymentMethod === 'whatsapp'
                                                        ? 'border-[#25D366] bg-green-50 shadow-sm ring-2 ring-[#25D366]/20'
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {paymentMethod === 'whatsapp' && (
                                                        <div className="absolute top-3 right-3 text-[#25D366]">
                                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                        </div>
                                                    )}
                                                    <div className="mb-4 h-[22px]"></div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-100 shadow-sm text-[#25D366]">
                                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.038 3.284l-.54 1.964 2.009-.528c.954.524 1.942.85 3.037.852 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.772-5.744-5.772zm3.374 8.086c-.1.272-.58.513-.801.551-.237.042-.46.079-.769-.015-.297-.091-.676-.239-1.144-.442-1.99-.861-3.284-2.885-3.383-3.018-.099-.134-.736-.979-.736-1.959 0-.979.512-1.46.694-1.658.183-.198.396-.247.53-.247.13 0 .26.012.37.012.11 0 .26-.041.408.321.148.36.512 1.25.56 1.348.049.099.083.214.016.347-.066.13-.1.214-.2.33-.1.115-.208.261-.297.35-.099.099-.198.198-.083.396.115.198.512.845 1.099 1.366.759.673 1.398.882 1.596.981.198.099.313.082.43-.049.115-.132.512-.596.644-.793.132-.198.26-.165.43-.099.172.066 1.09.514 1.277.613.183.1.312.148.363.23.049.082.049.479-.05.751z" /></svg>
                                                        </div>
                                                        <span className="font-bold text-gray-900">WhatsApp Order</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 font-medium">Order via WhatsApp and pay on delivery.</p>
                                                </div>

                                                {/* Card Option */}
                                                <div
                                                    onClick={() => setValue('paymentMethod', 'card')}
                                                    className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 ${paymentMethod === 'card'
                                                        ? 'border-melagri-primary bg-blue-50/50 shadow-sm ring-2 ring-melagri-primary/20'
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {paymentMethod === 'card' && (
                                                        <div className="absolute top-3 right-3 text-melagri-primary">
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
                                                    onClick={() => setValue('paymentMethod', 'cod')}
                                                    className={`relative cursor-pointer rounded-2xl border-2 p-6 transition-all duration-200 ${paymentMethod === 'cod'
                                                        ? 'border-gray-800 bg-gray-100 shadow-sm ring-2 ring-gray-800/20'
                                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {paymentMethod === 'cod' && (
                                                        <div className="absolute top-3 right-3 text-gray-800">
                                                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                        </div>
                                                    )}
                                                    <div className="mb-4 h-[22px]"></div>
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
                                            <div className="mt-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {paymentMethod === 'mpesa' && (
                                                    <div className="bg-[#f0f9f1] p-6 rounded-2xl border border-green-100 animate-in fade-in slide-in-from-top-2">
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
                                                            <button
                                                                type="button"
                                                                onClick={() => setCurrentStep(1)}
                                                                className="text-sm font-bold text-[#22c55e] hover:underline px-4"
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {paymentMethod === 'manual_mpesa' && (
                                                    <div className="bg-[#f0f9f1] p-6 rounded-2xl border border-green-100 animate-in fade-in slide-in-from-top-2">
                                                        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                                                            <span className="text-xl">📲</span> Pay via M-Pesa Paybill
                                                        </h3>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 space-y-3">
                                                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                                                <span className="text-gray-500 text-sm font-medium">Business No.</span>
                                                                <span className="font-black text-xl text-gray-900 tracking-wider">522522</span>
                                                            </div>
                                                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                                                <span className="text-gray-500 text-sm font-medium">Account No.</span>
                                                                <span className="font-bold text-gray-900">MELAGRO</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-500 text-sm font-medium">Amount</span>
                                                                <span className="font-black text-xl text-melagri-primary">KES {total.toLocaleString()}</span>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="block text-sm font-bold text-gray-900">Enter M-Pesa Transaction Code</label>
                                                            <Input
                                                                name="transactionCode"
                                                                placeholder="e.g. QHG45..."
                                                                className="uppercase tracking-widest font-mono"
                                                                format="uppercase"
                                                            />
                                                            <p className="text-xs text-gray-500">You will receive this code in the SMS from M-Pesa.</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {paymentMethod === 'whatsapp' && (
                                                    <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                                        <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-2">
                                                            <span className="text-xl">💬</span> WhatsApp Ordering
                                                        </h3>
                                                        <p className="text-sm text-gray-600">
                                                            Complete your order on WhatsApp. Our team will confirm your items and arrange delivery details via chat.
                                                        </p>
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
                                                    type="button"
                                                    className="w-1/3 border-2 border-gray-100 text-gray-600 px-6 py-4 rounded-xl font-bold hover:bg-gray-50 hover:text-gray-900 transition-all text-sm uppercase tracking-wide"
                                                >
                                                    ← Back
                                                </button>
                                                <button
                                                    onClick={handleNextStep}
                                                    type="button"
                                                    className="flex-grow bg-[#22c55e] hover:bg-green-600 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg shadow-[#22c55e]/20 text-sm uppercase tracking-widest"
                                                >
                                                    Review Order →
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Step 3: Review */}
                                    {currentStep === 3 && (
                                        <motion.div
                                            key="step3"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm"
                                        >
                                            <h2 className="text-2xl font-bold mb-8 text-gray-900">Review Your Order</h2>

                                            <div className="space-y-8">
                                                {/* Shipping Address */}
                                                <div className="pb-8 border-b">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <h3 className="font-bold text-gray-900">Shipping Address</h3>
                                                        <button
                                                            type="button"
                                                            className="text-melagri-primary hover:underline text-sm font-semibold"
                                                            onClick={() => setCurrentStep(1)}
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                    <p className="text-gray-900 font-semibold">{shippingData.firstName} {shippingData.lastName}</p>
                                                    <p className="text-gray-600">{shippingData.address}</p>
                                                    <p className="text-gray-600">{shippingData.town}, {shippingData.county}</p>
                                                    <p className="text-gray-600">{shippingData.phone}</p>
                                                </div>

                                                {/* Shipping Method */}
                                                <div className="pb-8 border-b">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <h3 className="font-bold text-gray-900">Shipping Method</h3>
                                                        <button
                                                            type="button"
                                                            className="text-melagri-primary hover:underline text-sm font-semibold"
                                                            onClick={() => setCurrentStep(1)}
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                    <p className="text-gray-900 font-semibold">{shippingMethod === 'standard' ? 'Standard Delivery (2-3 Days)' : 'Pick-up from Store'}</p>
                                                </div>

                                                {/* Payment Method */}
                                                <div className="pb-8 border-b">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <h3 className="font-bold text-gray-900">Payment Method</h3>
                                                        <button
                                                            type="button"
                                                            className="text-melagri-primary hover:underline text-sm font-semibold"
                                                            onClick={() => setCurrentStep(2)}
                                                        >
                                                            Edit
                                                        </button>
                                                    </div>
                                                    <p className="text-gray-900 font-semibold uppercase">
                                                        {paymentMethod === 'cod' ? 'Cash on Delivery' :
                                                            paymentMethod === 'whatsapp' ? 'WhatsApp Order' : paymentMethod}
                                                    </p>
                                                    <p className="text-gray-600 text-sm">
                                                        {paymentMethod === 'mpesa' && 'Paying via M-Pesa Express (Phone)'}
                                                        {paymentMethod === 'card' && 'Paying via Secure Card (Stripe)'}
                                                        {paymentMethod === 'cod' && 'Pay on Delivery / Collection'}
                                                        {paymentMethod === 'whatsapp' && 'Confirm and complete order on WhatsApp'}
                                                    </p>
                                                </div>

                                                {/* Order Items */}
                                                <div>
                                                    <h3 className="font-bold text-gray-900 mb-4">Order Items ({cartItems.length})</h3>
                                                    <div className="space-y-3">
                                                        {cartItems.map(item => (
                                                            <div key={item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : String(item.id)} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                                <div className="flex-1">
                                                                    <p className="font-semibold text-gray-900">{item.name}</p>
                                                                    {item.selectedVariant && (
                                                                        <p className="text-xs text-melagri-primary font-bold uppercase tracking-widest mt-0.5">
                                                                            Size/Weight: {item.selectedVariant.name}
                                                                        </p>
                                                                    )}
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
                                                    type="button"
                                                    className="flex-1 border-2 border-gray-300 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                                                >
                                                    ← Back
                                                </button>
                                                <button
                                                    onClick={handleSubmit(onSubmit)}
                                                    disabled={isProcessing}
                                                    type="button"
                                                    className="flex-1 bg-melagri-primary hover:bg-melagri-secondary text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                                        paymentMethod === 'whatsapp' ? 'Complete on WhatsApp' : 'Place Order'
                                                    )}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Order Summary Sidebar */}
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-2xl p-6 border border-gray-200 sticky top-24 h-fit">
                                    <h3 className="font-bold text-gray-900 mb-6 text-lg">Order Summary</h3>

                                    <div className="space-y-3 mb-6 pb-6 border-b">
                                        {(user?.loyaltyPoints || 0) > 0 && (
                                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 mb-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="text-xs font-bold text-purple-700 uppercase tracking-tight">Available Points: {user?.loyaltyPoints}</p>
                                                    <div className="relative inline-block w-8 h-4 align-middle select-none transition duration-200 ease-in">
                                                        <input
                                                            type="checkbox"
                                                            checked={usePoints}
                                                            onChange={(e) => setUsePoints(e.target.checked)}
                                                            className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                                            style={{ right: usePoints ? '0' : 'auto', borderColor: usePoints ? '#7c3aed' : '#d1d5db' }}
                                                        />
                                                        <label className={`toggle-label block overflow-hidden h-4 rounded-full cursor-pointer ${usePoints ? 'bg-purple-300' : 'bg-gray-300'}`}></label>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-purple-600 font-medium">Redeem points for a KES {Math.min(cartTotal, user?.loyaltyPoints || 0).toLocaleString()} discount!</p>
                                            </div>
                                        )}

                                        {cartItems.map(item => (
                                            <div key={item.selectedVariant ? `${item.id}-${item.selectedVariant.id}` : String(item.id)} className="flex gap-3">
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-16 h-16 rounded object-cover bg-gray-100"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">{item.name}</p>
                                                    {item.selectedVariant && (
                                                        <p className="text-[10px] font-bold text-melagri-primary uppercase tracking-tighter mt-1">
                                                            {item.selectedVariant.name}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                                                    <p className="text-sm font-bold text-melagri-primary mt-1">KES {(item.price * item.quantity).toLocaleString()}</p>
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
                                            <span className="font-semibold">{shippingCost === 0 ? "FREE" : `KES ${shippingCost.toLocaleString()}`}</span>
                                        </div>
                                        {shippingMethod === 'standard' && (
                                            <div className="flex justify-end -mt-2">
                                                <p className="text-[10px] text-gray-400 italic">{deliveryInfo.reason}</p>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-gray-600 border-t pt-3">
                                            <span>Tax (16% VAT)</span>
                                            <span className="font-semibold">Included</span>
                                        </div>
                                        <div className="pt-3 flex justify-between text-lg font-bold text-melagri-primary border-t border-gray-100">
                                            <span>Total</span>
                                            <span>KES {total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </FormProvider>
    );
}

