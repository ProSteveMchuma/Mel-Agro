
// ...

const [notificationPreferences, setNotificationPreferences] = useState<string[]>(['email', 'sms']);
const [paymentMethod, setPaymentMethod] = useState('mpesa');
const [shippingMethod, setShippingMethod] = useState('delivery'); // 'collection', 'delivery', 'custom'
const [shippingCost, setShippingCost] = useState(0);

// Update shipping cost when county or settings change
useEffect(() => {
    if (shippingMethod === 'collection') {
        setShippingCost(0);
        return;
    }

    // Find zone for the selected county
    const zone = shipping.zones.find(z => z.regions.includes(formData.county));
    // Default to 'Rest of Kenya' (usually the last one or high price) if not found, or 750
    const price = zone ? zone.price : 750;
    setShippingCost(price);
}, [formData.county, shipping, shippingMethod]);

const [couponCode, setCouponCode] = useState("");
const [discountAmount, setDiscountAmount] = useState(0);
const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
const [couponError, setCouponError] = useState("");
const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

const total = cartTotal + shippingCost - discountAmount;

const [saveAddress, setSaveAddress] = useState(false);
const [errors, setErrors] = useState<any>({});

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
        setErrors((prev: any) => ({ ...prev, [name]: "" }));
    }
};

const handleNotificationChange = (type: string) => {
    setNotificationPreferences(prev =>
        prev.includes(type)
            ? prev.filter(p => p !== type)
            : [...prev, type]
    );
};

const validateStep1 = () => {
    const newErrors: any = {};
    if (!formData.firstName) newErrors.firstName = "First name is required";
    if (!formData.lastName) newErrors.lastName = "Last name is required";
    if (!formData.phone) newErrors.phone = "Phone number is required";
    if (!formData.address) newErrors.address = "Address is required";
    if (!formData.city) newErrors.city = "City is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
};

const nextStep = () => {
    if (currentStep === 1) {
        if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
        setCurrentStep(3);
    }
};

const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
};

const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    setIsValidatingCoupon(true);

    try {
        // Import db here to avoid server-side issues if any, or just use the imported one
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");

        const q = query(collection(db, "discounts"), where("code", "==", couponCode.toUpperCase()), where("isActive", "==", true));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            setCouponError("Invalid coupon code.");
            setIsValidatingCoupon(false);
            return;
        }

        const discountDoc = snapshot.docs[0];
        const discount = discountDoc.data();
        const now = new Date();
        const expiresAt = discount.expiresAt.toDate();

        if (now > expiresAt) {
            setCouponError("This coupon has expired.");
            setIsValidatingCoupon(false);
            return;
        }

        if (discount.minOrderValue && cartTotal < discount.minOrderValue) {
            setCouponError(`Minimum order value of KES ${discount.minOrderValue} required.`);
            setIsValidatingCoupon(false);
            return;
        }

        if (discount.usageLimit && discount.usageLimit <= 0) {
            setCouponError("This coupon has reached its usage limit.");
            setIsValidatingCoupon(false);
            return;
        }

        // Calculate discount
        let amount = 0;
        if (discount.type === 'PERCENTAGE') {
            amount = (cartTotal * discount.value) / 100;
        } else {
            amount = discount.value;
        }

        // Ensure discount doesn't exceed total
        amount = Math.min(amount, cartTotal);

        setDiscountAmount(amount);
        setAppliedDiscount({ id: discountDoc.id, ...discount });
        setCouponError("");
        alert(`Coupon applied! You saved KES ${amount.toLocaleString()}`);

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
    setIsProcessing(true);

    try {
        // 0. Save Address if requested
        if (saveAddress) {
            await updateUserProfile({
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                county: formData.county
            });
        }

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
                                        <input name="firstName" value={formData.firstName} onChange={handleInputChange} type="text" className={`w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary ${errors.firstName ? 'border-red-500' : ''}`} />
                                        {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <input name="lastName" value={formData.lastName} onChange={handleInputChange} type="text" className={`w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary ${errors.lastName ? 'border-red-500' : ''}`} />
                                        {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                        <input name="phone" value={formData.phone} onChange={handleInputChange} type="tel" placeholder="07..." className={`w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary ${errors.phone ? 'border-red-500' : ''}`} />
                                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <input name="address" value={formData.address} onChange={handleInputChange} type="text" placeholder="Street, Building, etc." className={`w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary ${errors.address ? 'border-red-500' : ''}`} />
                                        {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">City/Town</label>
                                        <input name="city" value={formData.city} onChange={handleInputChange} type="text" className={`w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary ${errors.city ? 'border-red-500' : ''}`} />
                                        {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
                                        <select name="county" value={formData.county} onChange={handleInputChange} className="w-full rounded-lg border-gray-300 focus:ring-melagro-primary focus:border-melagro-primary">
                                            {KENYAN_COUNTIES.map(county => (
                                                <option key={county} value={county}>{county}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Save Address Checkbox */}
                                    <div className="md:col-span-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={saveAddress}
                                                onChange={(e) => setSaveAddress(e.target.checked)}
                                                className="rounded text-melagro-primary focus:ring-melagro-primary"
                                            />
                                            <span className="text-sm text-gray-600">Save this address for future orders</span>
                                        </label>
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
                                            <div className="h-6 w-10 bg-gray-200 rounded"></div>
                                            <div className="h-6 w-10 bg-gray-200 rounded"></div>
                                        </div>
                                    </label>

                                    <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-melagro-primary bg-green-50 ring-1 ring-melagro-primary' : 'border-gray-200 hover:bg-gray-50'}`}>
                                        <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-melagro-primary focus:ring-melagro-primary" />
                                        <div className="ml-4 flex-grow">
                                            <span className="block font-bold text-gray-900">Cash on Delivery</span>
                                            <span className="block text-sm text-gray-500">Pay when you receive your order. Call +254 748 970757 to confirm.</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div className="flex justify-between pt-6">
                            {currentStep > 1 ? (
                                <button
                                    onClick={prevStep}
                                    className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                                >
                                    Back
                                </button>
                            ) : (
                                <div></div>
                            )}

                            {currentStep < 3 ? (
                                <button
                                    onClick={nextStep}
                                    className="px-8 py-3 bg-melagro-primary text-white rounded-xl font-bold hover:bg-melagro-dark transition-colors shadow-lg shadow-melagro-primary/30"
                                >
                                    Continue
                                </button>
                            ) : (
                                <button
                                    onClick={handlePlaceOrder}
                                    disabled={isProcessing}
                                    className={`px-8 py-3 bg-melagro-primary text-white rounded-xl font-bold hover:bg-melagro-dark transition-colors shadow-lg shadow-melagro-primary/30 flex items-center gap-2 ${isProcessing ? 'opacity-75 cursor-not-allowed' : ''}`}
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
                                        <>
                                            Place Order
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:w-1/3">
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
                    </div>
                </div>
            </div>
        </main>

        <Footer />
    </div>
);
}
