"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OrderSummary from '@/components/checkout/OrderSummary';
import { PaymentService } from '@/lib/payment';
import { NotificationService } from '@/lib/notifications';
import { KENYAN_COUNTIES, getDeliveryCost } from '@/lib/delivery';
import { useSettings } from '@/context/SettingsContext';

export default function CheckoutPage() {
    const router = useRouter();
    const { cartItems, cartTotal, clearCart } = useCart();
    const { user, isLoading: authLoading, updateUserProfile } = useAuth();
    const { addOrder } = useOrders();
    const { shipping } = useSettings();

    const [isProcessing, setIsProcessing] = useState(false);

    // Redirect if cart is empty
    useEffect(() => {
        if (!authLoading && cartItems.length === 0) {
            router.push('/cart');
        }
    }, [cartItems, authLoading, router]);

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        address: '',
        city: '',
        county: 'Nairobi'
    });

    const [notificationPreferences, setNotificationPreferences] = useState<string[]>(['email', 'sms']);
    const [paymentMethod, setPaymentMethod] = useState('mpesa');
    const [shippingMethod, setShippingMethod] = useState('delivery');
    const [shippingCost, setShippingCost] = useState(0);

    const [couponCode, setCouponCode] = useState("");
    const [discountAmount, setDiscountAmount] = useState(0);
    const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
    const [couponError, setCouponError] = useState("");
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
    const [saveAddress, setSaveAddress] = useState(true);
    const [errors, setErrors] = useState<any>({});

    // Points System
    const [usePoints, setUsePoints] = useState(false);

    const pointsBalance = user?.loyaltyPoints || 0;
    const pointsDiscount = usePoints ? Math.min(pointsBalance, (cartTotal + shippingCost) * 0.5) : 0;

    const total = cartTotal + shippingCost - discountAmount - pointsDiscount;

    // Load User Data
    useEffect(() => {
        if (user) {
            const names = user.name ? user.name.split(' ') : ['', ''];
            setFormData(prev => ({
                ...prev,
                firstName: names[0] || '',
                lastName: names.slice(1).join(' ') || '',
                phone: user.phone || '',
                address: user.address || '',
                city: user.city || '',
                county: user.county || 'Nairobi'
            }));
        }
    }, [user]);

    // Calculate Shipping
    useEffect(() => {
        if (shippingMethod === 'collection') {
            setShippingCost(0);
            return;
        }
        const zone = shipping.zones.find(z => z.regions.includes(formData.county));
        const price = zone ? zone.price : 750;
        setShippingCost(price);
    }, [formData.county, shipping, shippingMethod]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let formattedValue = value;

        // Intelligent Phone Formatting
        if (name === 'phone') {
            // Remove non-numeric characters
            const numeric = value.replace(/\D/g, '');
            // Auto-format 07... to +254 7...
            if (numeric.startsWith('07') && numeric.length <= 10) {
                formattedValue = numeric; // Keep typing as is for better UX, but visually show +254 in hint if needed
                // Actually, let's keep it simple: just strip non-numeric
            }
            formattedValue = numeric;
        }

        setFormData(prev => ({ ...prev, [name]: formattedValue }));

        // Live Validation: Clear error if valid
        if (errors[name]) {
            if (name === 'phone' && formattedValue.length >= 10) {
                setErrors((prev: any) => ({ ...prev, [name]: "" }));
            } else if (name !== 'phone' && formattedValue.trim().length > 0) {
                setErrors((prev: any) => ({ ...prev, [name]: "" }));
            }
        }
    };

    const validateForm = () => {
        const newErrors: any = {};
        if (!formData.firstName) newErrors.firstName = "First name is required";
        if (!formData.lastName) newErrors.lastName = "Last name is required";

        // Strict Phone Validation
        if (!formData.phone) {
            newErrors.phone = "Phone number is required";
        } else if (!/^(\+?254|0)?7\d{8}$/.test(formData.phone)) {
            newErrors.phone = "Invalid Kenyan phone number (e.g. 0712345678)";
        }

        if (!formData.address) newErrors.address = "Address is required";
        if (!formData.city) newErrors.city = "City is required";

        setErrors(newErrors);

        // Smooth Scroll to first error
        const firstErrorKey = Object.keys(newErrors)[0];
        if (firstErrorKey) {
            const element = document.getElementsByName(firstErrorKey)[0];
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
            }
        }

        return Object.keys(newErrors).length === 0;
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponError("");
        setIsValidatingCoupon(true);

        try {
            const { collection, query, where, getDocs } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            const q = query(collection(db, "discounts"), where("code", "==", couponCode.toUpperCase()), where("isActive", "==", true));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setCouponError("Invalid coupon code.");
                return;
            }

            const discount = snapshot.docs[0].data();
            // ... (validation logic can be expanded as needed, simplifying here for brevity) ...
            let amount = discount.type === 'PERCENTAGE' ? (cartTotal * discount.value) / 100 : discount.value;
            amount = Math.min(amount, cartTotal);

            setDiscountAmount(amount);
            setAppliedDiscount({ id: snapshot.docs[0].id, ...discount });
            alert(`Coupon applied! Saved KES ${amount}`);

        } catch (error) {
            console.error("Error validating coupon:", error);
            setCouponError("Failed to validate coupon.");
        } finally {
            setIsValidatingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setCouponCode("");
        setDiscountAmount(0);
        setAppliedDiscount(null);
        setCouponError("");
    };

    const handlePlaceOrder = async () => {
        if (!user) {
            router.push('/auth/login?callbackUrl=/checkout');
            return;
        }
        if (!validateForm()) {
            alert("Please fill in all required fields.");
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setIsProcessing(true);
        try {
            if (saveAddress) {
                await updateUserProfile({
                    phone: formData.phone,
                    address: formData.address,
                    city: formData.city,
                    county: formData.county
                });
            }

            // Deduct Points
            if (usePoints && pointsDiscount > 0) {
                const { doc, updateDoc, increment } = await import('firebase/firestore');
                const { db } = await import('@/lib/firebase');
                await updateDoc(doc(db, 'users', user.uid), {
                    loyaltyPoints: increment(-Math.floor(pointsDiscount))
                });
            }

            // Payment
            if (paymentMethod === 'mpesa') {
                const res = await PaymentService.initiateMpesaPayment(formData.phone, total);
                if (!res.success) throw new Error(res.message);
            }

            // Order Creation
            const orderData = {
                userId: user.uid,
                userName: `${formData.firstName} ${formData.lastName}`,
                userEmail: user.email || "",
                phone: formData.phone,
                items: cartItems.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image })),
                subtotal: cartTotal,
                total: total,
                shippingCost: shippingCost,
                discountAmount: discountAmount,
                couponCode: appliedDiscount ? appliedDiscount.code : null,
                paymentMethod: paymentMethod,
                shippingAddress: {
                    county: formData.county,
                    details: `${formData.address}, ${formData.city}`,
                    method: shippingMethod
                },
                paymentStatus: (paymentMethod === 'cod' ? 'Unpaid' : 'Paid') as 'Paid' | 'Unpaid',
                notificationPreferences: notificationPreferences
            };

            const newOrder = await addOrder(orderData);

            // Notifications
            await NotificationService.notify(
                notificationPreferences,
                { email: user.email || "", phone: formData.phone },
                { subject: "Order Received", emailBody: "Thank you for your order.", smsBody: `Order #${newOrder.id.substr(0, 5)} received. Amount: KES ${total}` }
            );

            clearCart();
            router.push(`/checkout/success?orderId=${newOrder.id}`);

        } catch (error: any) {
            console.error("Checkout Error:", error);
            alert(`Order failed: ${error.message || "Unknown error"}`);
        } finally {
            setIsProcessing(false);
        }
    };

    if (authLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <Header />
            <main className="flex-grow py-8 px-4 md:px-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-extrabold text-melagro-primary mb-8">Secure Checkout</h1>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* LEFT COLUMN: FORMS */}
                        <div className="lg:w-2/3 space-y-6">

                            {/* 1. Contact Info */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-melagro-primary text-white flex items-center justify-center text-sm">1</span>
                                    Contact Details
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                        <div className="relative">
                                            <input name="firstName" value={formData.firstName} onChange={handleInputChange} className={`w-full p-3 rounded-lg border ${errors.firstName ? 'border-red-500 bg-red-50' : formData.firstName ? 'border-green-400 bg-green-50' : 'border-gray-300'} focus:ring-2 focus:ring-melagro-primary/50 outline-none`} placeholder="e.g. John" />
                                            {formData.firstName && !errors.firstName && <span className="absolute right-3 top-3 text-green-500">✓</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <div className="relative">
                                            <input name="lastName" value={formData.lastName} onChange={handleInputChange} className={`w-full p-3 rounded-lg border ${errors.lastName ? 'border-red-500 bg-red-50' : formData.lastName ? 'border-green-400 bg-green-50' : 'border-gray-300'} focus:ring-2 focus:ring-melagro-primary/50 outline-none`} placeholder="e.g. Doe" />
                                            {formData.lastName && !errors.lastName && <span className="absolute right-3 top-3 text-green-500">✓</span>}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (M-Pesa)</label>
                                        <div className="relative">
                                            <input name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className={`w-full p-3 rounded-lg border ${errors.phone ? 'border-red-500 bg-red-50' : formData.phone && /^(?:254|\+254|0)?7\d{8}$/.test(formData.phone) ? 'border-green-400 bg-green-50' : 'border-gray-300'} focus:ring-2 focus:ring-melagro-primary/50 outline-none`} placeholder="0712 345 678" />
                                            {formData.phone && !errors.phone && /^(?:254|\+254|0)?7\d{8}$/.test(formData.phone) && <span className="absolute right-3 top-3 text-green-500">✓</span>}
                                        </div>
                                        {errors.phone ? <p className="text-xs text-red-500 mt-1">{errors.phone}</p> : <p className="text-xs text-gray-500 mt-1">We'll use this for M-Pesa payment updates.</p>}
                                    </div>
                                </div>
                            </div>

                            {/* 2. Delivery */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-melagro-primary text-white flex items-center justify-center text-sm">2</span>
                                    Delivery Info
                                </h2>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                                            <select name="county" value={formData.county} onChange={handleInputChange} className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none bg-white">
                                                {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Town / City</label>
                                            <input name="city" value={formData.city} onChange={handleInputChange} className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none" placeholder="e.g. Nakuru Town" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nearest Landmark / Building</label>
                                            <input name="address" value={formData.address} onChange={handleInputChange} className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-melagro-primary/50 outline-none" placeholder="e.g. Beside Shell Petrol Station" />
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-gray-100">
                                        <p className="font-medium text-gray-900 mb-2">Delivery Method</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <label className={`cursor-pointer p-4 border rounded-xl flex items-center gap-3 transition-colors ${shippingMethod === 'delivery' ? 'bg-green-50 border-melagro-primary' : 'hover:bg-gray-50'}`}>
                                                <input type="radio" name="shipping" value="delivery" checked={shippingMethod === 'delivery'} onChange={(e) => setShippingMethod(e.target.value)} className="text-melagro-primary" />
                                                <div>
                                                    <div className="font-bold text-gray-900">Delivery</div>
                                                    <div className="text-xs text-gray-500">To your farm/doorstep</div>
                                                </div>
                                            </label>
                                            <label className={`cursor-pointer p-4 border rounded-xl flex items-center gap-3 transition-colors ${shippingMethod === 'collection' ? 'bg-green-50 border-melagro-primary' : 'hover:bg-gray-50'}`}>
                                                <input type="radio" name="shipping" value="collection" checked={shippingMethod === 'collection'} onChange={(e) => setShippingMethod(e.target.value)} className="text-melagro-primary" />
                                                <div>
                                                    <div className="font-bold text-gray-900">Pick Up</div>
                                                    <div className="text-xs text-gray-500">From our stores</div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Payment */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-melagro-primary text-white flex items-center justify-center text-sm">3</span>
                                    Payment
                                </h2>
                                <div className="space-y-3">
                                    <label className={`cursor-pointer p-4 border rounded-xl flex items-center gap-4 transition-all ${paymentMethod === 'mpesa' ? 'border-melagro-primary bg-green-50 ring-1 ring-melagro-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="payment" value="mpesa" checked={paymentMethod === 'mpesa'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-melagro-primary w-5 h-5" />
                                        <div className="flex-grow">
                                            <span className="block font-bold text-gray-900">M-Pesa (Recommended)</span>
                                            <span className="block text-sm text-gray-500">Instant payment to Paybill</span>
                                        </div>
                                        <span className="font-bold text-green-600 bg-green-100 px-2 py-1 rounded text-xs">FAST</span>
                                    </label>

                                    <label className={`cursor-pointer p-4 border rounded-xl flex items-center gap-4 transition-all ${paymentMethod === 'cod' ? 'border-melagro-primary bg-green-50 ring-1 ring-melagro-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-melagro-primary w-5 h-5" />
                                        <div>
                                            <span className="block font-bold text-gray-900">Cash on Delivery</span>
                                            <span className="block text-sm text-gray-500">Pay when you receive commodities</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                        </div>

                        {/* RIGHT COLUMN: SUMMARY */}
                        <div className="lg:w-1/3 lg:sticky lg:top-24 h-fit">
                            <OrderSummary
                                shippingCost={shippingCost}
                                shippingCounty={formData.county}
                                discountAmount={discountAmount}
                                couponCode={couponCode}
                                setCouponCode={setCouponCode}
                                onApplyCoupon={handleApplyCoupon}
                                onRemoveCoupon={handleRemoveCoupon}
                                couponError={couponError}
                                isApplyingCoupon={isValidatingCoupon}
                                appliedDiscount={appliedDiscount}
                            />

                            {/* Loyalty Points Redemption */}
                            {user && pointsBalance > 0 && (
                                <div className="mt-4 bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-xl">
                                                🎁
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-amber-900">Use Harvest Points</div>
                                                <div className="text-xs text-amber-700 font-medium">Available: {pointsBalance} pts</div>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={usePoints}
                                                onChange={(e) => setUsePoints(e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                        </label>
                                    </div>
                                    {usePoints && (
                                        <div className="mt-2 text-xs text-green-700 font-bold flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Saving KES {pointsDiscount.toLocaleString()} with points!
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handlePlaceOrder}
                                disabled={isProcessing || authLoading}
                                className={`w-full mt-6 text-white text-lg font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed hidden lg:flex items-center justify-center gap-2 ${!user ? 'bg-gray-800 hover:bg-gray-900 shadow-gray-900/30' : 'bg-melagro-primary hover:bg-melagro-dark shadow-melagro-primary/30'}`}
                            >
                                {isProcessing ? (
                                    <>Processing...</>
                                ) : !user ? (
                                    <>Login to Complete Order</>
                                ) : (
                                    <>
                                        Complete Order
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </>
                                )}
                            </button>


                            {/* Mobile Sticky Complete Order Bar */}
                            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:hidden z-50 safe-area-bottom">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-xs text-gray-500">Total to Pay</div>
                                        <div className="text-lg font-extrabold text-melagro-primary">KES {(cartTotal + shippingCost - appliedDiscount - pointsDiscount).toLocaleString()}</div>
                                    </div>
                                    <button
                                        onClick={handlePlaceOrder}
                                        disabled={isProcessing || authLoading}
                                        className={`text-white py-3 px-6 rounded-xl font-bold text-sm shadow-lg flex-grow disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${!user ? 'bg-gray-800 hover:bg-gray-900 shadow-gray-900/30' : 'bg-melagro-primary hover:bg-melagro-dark shadow-melagro-primary/30'}`}
                                    >
                                        {isProcessing ? 'Processing...' : !user ? 'Login to Order' : 'Complete Order'}
                                        {!isProcessing && user && (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Secure Encrypted Transaction
                            </div>
                        </div>
                    </div>
                </div >
            </main>
            <Footer />
        </div>
    );
}
