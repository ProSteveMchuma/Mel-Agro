"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { useProducts } from '@/context/ProductContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { doc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { generateWhatsAppMessage, getWhatsAppUrl } from '@/lib/whatsapp';
import { useBehavior } from '@/context/BehaviorContext';
import { getMpesaErrorMessage } from '@/lib/mpesa';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { getDeliveryCost, KENYAN_COUNTIES } from '@/lib/delivery';
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

const KENYA_COUNTIES = KENYAN_COUNTIES.map(c => ({ value: c, label: c }));

export default function CheckoutPage() {
    const router = useRouter();
    const { cartItems, cartTotal, clearCart, removeFromCart, updateQuantity } = useCart();
    const { user } = useAuth();
    const { addOrder, orders: userOrders } = useOrders();
    const { trackAction } = useBehavior();
    const { products: catalog } = useProducts();

    const [currentStep, setCurrentStep] = useState(1); // 1: Shipping, 2: Payment, 3: Review
    const [isProcessing, setIsProcessing] = useState(false);
    const [usePoints, setUsePoints] = useState(false);
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; type: string; value: number; amount: number } | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [showMap, setShowMap] = useState(false);
    const [quickCheckoutDismissed, setQuickCheckoutDismissed] = useState(false);
    const [paymentFailure, setPaymentFailure] = useState<{ orderId: string; message: string } | null>(null);

    // Name-capture gate — phone-OTP signups land here without a real name
    const needsName = !!user && (!user.name || user.name === 'User');
    const [profileName, setProfileName] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [profileError, setProfileError] = useState('');

    const handleSaveProfileName = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = profileName.trim();
        if (trimmed.length < 2) {
            setProfileError('Please enter your name (at least 2 characters)');
            return;
        }
        if (trimmed.length > 80) {
            setProfileError('Name is too long');
            return;
        }
        if (!user?.uid) {
            setProfileError('Session expired — please sign in again.');
            return;
        }
        setSavingName(true);
        setProfileError('');
        try {
            await setDoc(doc(db, 'users', user.uid), {
                name: trimmed,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            // AuthContext's onAuthStateChanged listener will eventually re-read; meanwhile
            // close the modal optimistically. The shipping form watches `user.name` via
            // its useEffect reset, so the next render will pick it up.
            setProfileName('');
        } catch (err: any) {
            console.error('Profile name save failed:', err);
            setProfileError(err?.message || 'Could not save your name. Please try again.');
        } finally {
            setSavingName(false);
        }
    };

    // Initialize React Hook Form
    const methods = useForm<CheckoutFormData>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            shipping: {
                fullName: '',
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

    // Redirect away if cart is empty (defense in depth for the submit guard)
    useEffect(() => {
        if (!isProcessing && cartItems.length === 0) {
            router.replace('/cart');
        }
    }, [cartItems.length, isProcessing, router]);

    // Stock revalidation — re-check the catalog for any cart items now under-stocked or removed.
    // The cart can sit idle for days; ProductContext is streamed via onSnapshot so this stays fresh.
    const stockIssues = (() => {
        if (catalog.length === 0) return [] as Array<{ cartItem: any; available: number; reason: 'oos' | 'low' | 'gone' }>;
        const out: Array<{ cartItem: any; available: number; reason: 'oos' | 'low' | 'gone' }> = [];
        for (const item of cartItems) {
            const product: any = catalog.find(p => String(p.id) === String(item.id));
            if (!product) {
                out.push({ cartItem: item, available: 0, reason: 'gone' });
                continue;
            }
            let available = Number(product.stockQuantity) || 0;
            if ((item as any).selectedVariant?.id && Array.isArray(product.variants)) {
                const v = product.variants.find((x: any) => x.id === (item as any).selectedVariant.id);
                if (!v) {
                    out.push({ cartItem: item, available: 0, reason: 'gone' });
                    continue;
                }
                const vStock = Number(v.stockQuantity ?? v.stock);
                if (Number.isFinite(vStock)) available = vStock;
            }
            if (available <= 0) out.push({ cartItem: item, available: 0, reason: 'oos' });
            else if (available < item.quantity) out.push({ cartItem: item, available, reason: 'low' });
        }
        return out;
    })();

    // One-tap reorder — show a shortcut for returning customers when their cart is OK and
    // their last order is paid. Pre-fill is already done by the user-sync useEffect.
    const lastPaidOrder = userOrders.find(o => (o as any).paymentStatus === 'Paid');
    const showQuickCheckout =
        currentStep === 1 &&
        !quickCheckoutDismissed &&
        !!lastPaidOrder &&
        !!user?.name && user.name !== 'User' &&
        stockIssues.length === 0;

    const handleQuickCheckout = async () => {
        const ok = await trigger('shipping');
        if (!ok) {
            toast.error("Some delivery details are missing — please fill them in.");
            return;
        }
        trackAction('quick_checkout_used', { lastOrderId: lastPaidOrder?.id });
        setCurrentStep(3);
    };

    // Payment-failure recovery actions — surfaced inline at Step 3 when M-Pesa fails
    const handleFailureRetry = async () => {
        if (!paymentFailure) return;
        setIsProcessing(true);
        const t = toast.loading("Re-sending M-Pesa prompt...");
        try {
            const idToken = await getAuth().currentUser?.getIdToken();
            const res = await fetch('/api/payment/mpesa/retry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                },
                body: JSON.stringify({ orderId: paymentFailure.orderId, phoneNumber: shippingData.phone }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success("STK Push sent — check your phone, then complete from your dashboard.", { id: t, duration: 7000 });
                clearCart();
                router.push(`/dashboard/user?orderId=${paymentFailure.orderId}`);
            } else {
                toast.error(data.message || "Couldn't re-send the prompt.", { id: t });
                setIsProcessing(false);
            }
        } catch (e: any) {
            toast.error(e?.message || "Retry failed", { id: t });
            setIsProcessing(false);
        }
    };

    const handleFailureSwitchToTill = () => {
        setValue('paymentMethod', 'manual_mpesa');
        setPaymentFailure(null);
        setCurrentStep(2);
        toast("Switched to manual Buy Goods. Pay via your M-Pesa menu, then enter the receipt code.", { duration: 6000 });
    };

    const handleFailureSwitchToCod = () => {
        setValue('paymentMethod', 'cod');
        setPaymentFailure(null);
        setCurrentStep(3);
        toast.success("Switched to Cash on Delivery. Confirm to place the order.", { duration: 5000 });
    };

    const handlePayLater = () => {
        if (!paymentFailure) return;
        toast("Order saved as unpaid. Resume payment from your dashboard.", { duration: 5000 });
        clearCart();
        router.push(`/dashboard/user?orderId=${paymentFailure.orderId}`);
    };

    // Sync shipping data with user profile when user loads.
    // Prefer the most recently saved address (auto-saved on first order) over raw profile fields,
    // and default the payment method to whatever the user used last.
    useEffect(() => {
        if (!user) return;
        const saved = (user.savedAddresses || []) as any[];
        const primary = saved.find(a => a.isPrimary) || saved[saved.length - 1];

        const cleanName = user.name && user.name !== 'User' ? user.name : '';
        const validPaymentMethods = ['mpesa', 'manual_mpesa', 'card', 'cod', 'whatsapp'] as const;
        const preferred = (user as any).preferredPaymentMethod;
        const initialPaymentMethod = (preferred && validPaymentMethods.includes(preferred)) ? preferred : 'mpesa';

        reset({
            shipping: {
                fullName: cleanName,
                email: user.email || '',
                phone: user.phone || '',
                county: primary?.county || user.county || 'Nairobi',
                town: primary?.city || user.city || '',
                address: primary?.details || user.address || '',
                lat: primary?.lat ?? -1.2921,
                lng: primary?.lng ?? 36.8219,
            },
            shippingMethod: 'standard',
            paymentMethod: initialPaymentMethod,
        });
    }, [user, reset]);

    // Calculate dynamic shipping
    const deliveryInfo = getDeliveryCost(shippingData.county, cartTotal);
    const shippingCost = shippingMethod === 'standard' ? deliveryInfo.cost : 0;

    const discountFromPoints = usePoints ? Math.min(cartTotal, user?.loyaltyPoints || 0) : 0;
    const couponDiscount = appliedCoupon?.amount || 0;
    const total = Math.max(0, cartTotal + shippingCost - discountFromPoints - couponDiscount);

    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) return;
        setCouponLoading(true);
        try {
            const idToken = await getAuth().currentUser?.getIdToken();
            const res = await fetch('/api/discounts/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                },
                body: JSON.stringify({ code: couponInput.trim().toUpperCase(), cartTotal }),
            });
            const data = await res.json();
            if (data.success && data.discount) {
                setAppliedCoupon(data.discount);
                toast.success(data.message || 'Promo code applied');
                setCouponInput('');
            } else {
                toast.error(data.message || 'Invalid promo code');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Failed to validate code');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponInput('');
    };

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

        if (cartItems.length === 0) {
            toast.error("Your cart is empty.");
            router.push('/products');
            return;
        }

        const requiresPayment = ['mpesa', 'manual_mpesa', 'card'].includes(data.paymentMethod);
        if (requiresPayment && total <= 0) {
            toast.error("Order total must be greater than zero for this payment method.");
            return;
        }
        if (total < 0) {
            toast.error("Order total cannot be negative — adjust loyalty points.");
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
                userName: (user?.name && user.name !== 'User') ? user.name : data.shipping.fullName.trim(),
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
                discountAmount: discountFromPoints + couponDiscount,
                pointsRedeemed: discountFromPoints,
                couponDiscount: couponDiscount,
                couponCode: appliedCoupon?.code || null,
                couponId: appliedCoupon?.id || null,
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
                        (data.paymentMethod === 'manual_mpesa' ? `M-Pesa Till (${data.transactionCode})` : 'M-Pesa')),
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
                    userName: (user?.name && user.name !== 'User') ? user.name : data.shipping.fullName,
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

                const idToken = await getAuth().currentUser?.getIdToken();
                const response = await fetch('/api/payment/mpesa', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                    },
                    body: JSON.stringify({
                        orderId: newOrder.id,
                        phoneNumber: data.shipping.phone,
                        amount: total
                    })
                });

                const resData = await response.json();

                if (!resData.success) {
                    toast.error(resData.message || "Failed to initiate M-Pesa.", { id: loadingToast });
                    setIsProcessing(false);
                    return;
                }

                toast.success("Sent! Check your phone to pay.", { id: loadingToast });

                const orderRef = doc(db, 'orders', newOrder.id);
                let resolved = false;
                let pollTimer: ReturnType<typeof setInterval> | null = null;
                let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

                const finish = (status: 'paid' | 'failed' | 'timeout', msg?: string) => {
                    if (resolved) return;
                    resolved = true;
                    if (pollTimer) clearInterval(pollTimer);
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                    unsubscribe();

                    if (status === 'paid') {
                        toast.success("Payment Received! Order #" + newOrder.id.slice(0, 5));
                        clearCart();
                        router.push(`/checkout/success?orderId=${newOrder.id}`);
                    } else if (status === 'failed') {
                        toast.error(`Payment Failed: ${msg || 'Unknown error'}`, { duration: 6000 });
                        setPaymentFailure({ orderId: newOrder.id, message: msg || 'Unknown error' });
                        setIsProcessing(false);
                    } else {
                        toast("Payment check timed out. Visit your dashboard to retry.", { duration: 6000 });
                        clearCart();
                        router.push(`/dashboard/user?orderId=${newOrder.id}`);
                    }
                };

                const unsubscribe = onSnapshot(orderRef, (snapshot) => {
                    const updatedOrder = snapshot.data();
                    if (updatedOrder?.paymentStatus === 'Paid') {
                        finish('paid');
                    } else if (updatedOrder?.paymentStatus === 'Failed') {
                        const errorMsg = updatedOrder.paymentFailureMessage ||
                            getMpesaErrorMessage(updatedOrder.paymentFailureCode || updatedOrder.paymentFailureReason || 'Unknown');
                        finish('failed', errorMsg);
                    }
                });

                const startPolling = () => {
                    pollTimer = setInterval(async () => {
                        if (resolved) return;
                        try {
                            const tok = await getAuth().currentUser?.getIdToken();
                            const r = await fetch('/api/payment/mpesa/query', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
                                },
                                body: JSON.stringify({ orderId: newOrder.id }),
                            });
                            const j = await r.json();
                            if (j.paid) finish('paid');
                            else if (j.paymentStatus === 'Failed') finish('failed', j.message);
                        } catch {
                            // ignore transient errors
                        }
                    }, 5000);
                };

                setTimeout(() => { if (!resolved) startPolling(); }, 30000);

                timeoutTimer = setTimeout(() => finish('timeout'), 120000);

                return;
            }

            if (data.paymentMethod === 'card') {
                const loadingToast = toast.loading("Preparing secure checkout...");
                const cardToken = await getAuth().currentUser?.getIdToken();
                const response = await fetch('/api/payment/paystack/initialize', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(cardToken ? { Authorization: `Bearer ${cardToken}` } : {}),
                    },
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

                        {/* Stock issues banner — re-validates at entry */}
                        {stockIssues.length > 0 && (
                            <div className="mb-8 bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                                <div className="flex items-start gap-3 mb-4">
                                    <span className="text-2xl">⚠️</span>
                                    <div>
                                        <p className="font-black text-amber-900 text-sm uppercase tracking-tight">Some items in your cart need attention</p>
                                        <p className="text-xs text-amber-800 mt-0.5">Stock changed since you last visited. Update quantities or remove items to continue.</p>
                                    </div>
                                </div>
                                <ul className="space-y-2">
                                    {stockIssues.map(({ cartItem, available, reason }) => (
                                        <li key={cartItem.cartItemId || cartItem.id} className="bg-white rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 text-sm truncate">
                                                    {cartItem.name}
                                                    {cartItem.selectedVariant && <span className="text-gray-500 font-medium"> ({cartItem.selectedVariant.name})</span>}
                                                </p>
                                                <p className="text-xs text-amber-700 mt-0.5">
                                                    {reason === 'gone' && 'No longer available in our catalogue.'}
                                                    {reason === 'oos' && `Out of stock. You have ${cartItem.quantity} in cart.`}
                                                    {reason === 'low' && `Only ${available} in stock — you have ${cartItem.quantity} in cart.`}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                {reason === 'low' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(cartItem.cartItemId || String(cartItem.id), available)}
                                                        className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors"
                                                    >
                                                        Update to {available}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeFromCart(cartItem.cartItemId || String(cartItem.id))}
                                                    className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* One-tap reorder for returning customers */}
                        {showQuickCheckout && (
                            <div className="mb-8 bg-gradient-to-r from-melagri-primary to-green-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl shadow-green-500/10">
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full" />
                                <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/5 rounded-full" />
                                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xl">⚡</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Welcome back, {user?.name?.split(' ')[0]}</span>
                                        </div>
                                        <p className="font-black text-lg leading-tight">Same address & payment as last time?</p>
                                        <p className="text-xs text-white/80 mt-1 truncate">
                                            {(lastPaidOrder as any)?.shippingAddress?.details || ''}
                                            {' · '}
                                            {(lastPaidOrder as any)?.paymentMethod || ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleQuickCheckout}
                                            className="px-6 py-3 bg-white text-melagri-primary font-black uppercase text-xs tracking-widest rounded-xl hover:bg-green-50 transition-all shadow-lg"
                                        >
                                            Quick Checkout →
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setQuickCheckoutDismissed(true)}
                                            className="px-4 py-2 text-xs font-bold text-white/70 hover:text-white underline whitespace-nowrap"
                                        >
                                            Edit details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

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
                                                    label="Email Address (Optional)"
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

                                                <Input
                                                    name="shipping.fullName"
                                                    label="Full Name"
                                                    placeholder="e.g. Wanjiku Mwangi"
                                                />

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

                                                {/* Map Location Picker — collapsed by default to keep checkout fast */}
                                                <div className="mt-6">
                                                    {!showMap ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowMap(true)}
                                                            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 hover:border-melagri-primary hover:bg-green-50/50 rounded-2xl text-sm font-bold text-gray-500 hover:text-melagri-primary transition-all"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                            <span>Pin exact location on map (optional)</span>
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <label className="block text-sm font-semibold text-gray-900">Pin Your Exact Delivery Location</label>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowMap(false)}
                                                                    className="text-xs font-bold text-gray-400 hover:text-gray-700 underline"
                                                                >
                                                                    Hide map
                                                                </button>
                                                            </div>
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
                                                        </>
                                                    )}
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
                                                                <p className="text-sm text-gray-500">{deliveryInfo.etaText} — {deliveryInfo.zoneName}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold text-melagri-primary">
                                                                    {deliveryInfo.cost === 0 ? "FREE" : `KES ${deliveryInfo.cost.toLocaleString()}`}
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
                                                                <p className="text-sm text-gray-500">Collect at our store — ready in 1–2 hours</p>
                                                            </div>
                                                            <p className="font-bold text-melagri-primary">FREE</p>
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
                                                        <span className="font-bold text-gray-900">Buy Goods (Till)</span>
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

                                                {/* Card Payment (Paystack) — temporarily hidden until Paystack credentials are configured.
                                                    Re-enable by uncommenting this block AND setting PAYSTACK_SECRET_KEY +
                                                    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in .env.local / Vercel.
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
                                                    <p className="text-sm text-gray-500 font-medium">Visa, Mastercard processed securely via Paystack.</p>
                                                </div>
                                                */}

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
                                                            <span className="text-xl">📲</span> Pay via M-Pesa Buy Goods
                                                        </h3>
                                                        <p className="text-xs text-gray-500 mb-3">Lipa na M-Pesa → Buy Goods and Services → Enter Till Number</p>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 space-y-3">
                                                            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                                                <span className="text-gray-500 text-sm font-medium">Till No.</span>
                                                                <span className="font-black text-xl text-gray-900 tracking-wider">3130847</span>
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
                                                            You will be redirected to Paystack to complete your card transaction safely. We do not store your card details.
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
                                                    <p className="text-gray-900 font-semibold">{shippingData.fullName}</p>
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
                                                    <p className="text-gray-900 font-semibold">{shippingMethod === 'standard' ? `Standard Delivery — ${deliveryInfo.etaText}` : 'Pick-up from Store'}</p>
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
                                                        {paymentMethod === 'card' && 'Paying via Secure Card (Paystack)'}
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

                                            {/* Payment failure recovery — shows when an M-Pesa attempt failed on this order */}
                                            {paymentFailure && (
                                                <div className="mt-8 bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                                                    <div className="flex items-start gap-3 mb-4">
                                                        <span className="text-2xl">⚠️</span>
                                                        <div className="flex-1">
                                                            <p className="font-black text-red-900 text-sm uppercase tracking-tight">M-Pesa payment didn&apos;t go through</p>
                                                            <p className="text-sm text-red-700 mt-1">{paymentFailure.message}</p>
                                                            <p className="text-xs text-red-600 mt-2">Don&apos;t worry — your order is saved. Pick how you&apos;d like to pay:</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={handleFailureRetry}
                                                            disabled={isProcessing}
                                                            className="px-4 py-3 bg-melagri-primary text-white font-black uppercase text-xs tracking-widest rounded-xl hover:bg-melagri-secondary transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                                        >
                                                            <span>↻</span> Retry M-Pesa Prompt
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleFailureSwitchToTill}
                                                            disabled={isProcessing}
                                                            className="px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-50 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                                        >
                                                            <span>📲</span> Pay via Buy Goods (Till)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleFailureSwitchToCod}
                                                            disabled={isProcessing}
                                                            className="px-4 py-3 bg-white text-gray-900 border-2 border-gray-200 font-black uppercase text-xs tracking-widest rounded-xl hover:bg-gray-50 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                                        >
                                                            <span>💵</span> Cash on Delivery
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handlePayLater}
                                                            disabled={isProcessing}
                                                            className="px-4 py-3 bg-white text-gray-500 border-2 border-gray-100 font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-gray-50 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                                                        >
                                                            <span>⏱</span> Pay Later
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

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

                                    <div className="mb-4 pb-4 border-b border-gray-100">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Promo Code</p>
                                        {appliedCoupon ? (
                                            <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                                                <div className="text-xs">
                                                    <span className="font-black text-green-700">{appliedCoupon.code}</span>
                                                    <span className="text-green-600 ml-2">-KES {appliedCoupon.amount.toLocaleString()}</span>
                                                </div>
                                                <button type="button" onClick={handleRemoveCoupon} className="text-gray-400 hover:text-red-500" title="Remove">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={couponInput}
                                                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyCoupon(); } }}
                                                    placeholder="Enter code"
                                                    className="flex-1 px-3 py-2 text-sm font-mono uppercase tracking-wider rounded-lg border border-gray-200 focus:border-melagri-primary focus:ring-2 focus:ring-melagri-primary/10 outline-none"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleApplyCoupon}
                                                    disabled={couponLoading || !couponInput.trim()}
                                                    className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-all disabled:opacity-50"
                                                >
                                                    {couponLoading ? '...' : 'Apply'}
                                                </button>
                                            </div>
                                        )}
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
                                        {appliedCoupon && (
                                            <div className="flex justify-between text-green-600 font-semibold">
                                                <span>Promo ({appliedCoupon.code})</span>
                                                <span>- KES {appliedCoupon.amount.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {discountFromPoints > 0 && (
                                            <div className="flex justify-between text-purple-600 font-semibold">
                                                <span>Loyalty Points</span>
                                                <span>- KES {discountFromPoints.toLocaleString()}</span>
                                            </div>
                                        )}
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

                {/* Name-capture modal — blocks checkout until phone-only users add their name */}
                {needsName && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 relative animate-in slide-in-from-bottom-8">
                            <div className="text-center mb-6">
                                <div className="inline-flex w-14 h-14 bg-melagri-primary/10 text-melagri-primary rounded-2xl items-center justify-center text-2xl mb-3">👋</div>
                                <h2 className="text-xl font-black text-gray-900">One last thing — what should we call you?</h2>
                                <p className="text-sm text-gray-500 mt-2">We&apos;ll use this on your receipt and order updates. Just your name — takes a second.</p>
                            </div>

                            {profileError && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md mb-4">
                                    <p className="text-sm text-red-700">{profileError}</p>
                                </div>
                            )}

                            <form onSubmit={handleSaveProfileName} className="space-y-5">
                                <div>
                                    <label htmlFor="profile-name" className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Full name</label>
                                    <input
                                        id="profile-name"
                                        type="text"
                                        autoFocus
                                        autoComplete="name"
                                        required
                                        minLength={2}
                                        maxLength={80}
                                        placeholder="e.g. Wanjiku Mwangi"
                                        value={profileName}
                                        onChange={(e) => setProfileName(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-melagri-primary focus:ring-2 focus:ring-melagri-primary/20 outline-none text-base font-medium"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={savingName || profileName.trim().length < 2}
                                    className="w-full py-3.5 bg-melagri-primary text-white rounded-xl font-bold hover:bg-melagri-secondary transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                                >
                                    {savingName ? 'Saving...' : 'Save & Continue'}
                                </button>
                            </form>

                            <p className="text-xs text-gray-400 text-center mt-4">
                                You&apos;re signed in as <span className="font-mono font-bold">{user?.phone || user?.email}</span>
                            </p>
                        </div>
                    </div>
                )}

                <Footer />
            </div>
        </FormProvider>
    );
}

