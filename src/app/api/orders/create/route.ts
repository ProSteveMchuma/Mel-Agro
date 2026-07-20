import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as admin from 'firebase-admin';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser } from '@/lib/auth-server';
import { getDeliveryCost, KENYAN_COUNTIES } from '@/lib/delivery';
import { getZonesServer } from '@/lib/delivery-server';
import { CommunicationTemplates } from '@/lib/communication-templates';
import { sendServerEmail, sendServerSms } from '@/lib/server-notifications';

const lineItemSchema = z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    quantity: z.number().int().min(1).max(100),
    variantId: z.string().trim().min(1).max(120).optional(),
});

const createOrderSchema = z.object({
    items: z.array(lineItemSchema).min(1).max(50),
    shipping: z.object({
        fullName: z.string().trim().min(2).max(80),
        email: z.union([z.string().trim().email(), z.literal('')]).optional(),
        phone: z.string().trim()
            .transform(value => value.replace(/[\s()-]/g, ''))
            .pipe(z.string().regex(/^(?:\+254|0)[17]\d{8}$/, 'Use a valid Kenyan phone number')),
        county: z.string().trim().refine(value => KENYAN_COUNTIES.includes(value), 'Select a valid county'),
        town: z.string().trim().min(2).max(100),
        address: z.string().trim().min(5).max(300),
        lat: z.number().min(-5).max(6).optional(),
        lng: z.number().min(33).max(43).optional(),
    }),
    shippingMethod: z.enum(['standard', 'pickup']),
    paymentMethod: z.enum(['mpesa', 'manual_mpesa', 'card', 'cod', 'whatsapp']),
    transactionCode: z.string().trim().max(30).optional(),
    couponCode: z.string().trim().max(50).optional(),
    redeemPoints: z.boolean().default(false),
}).superRefine((value, ctx) => {
    const uniqueLines = new Set<string>();
    for (const item of value.items) {
        const key = `${item.id}:${item.variantId || ''}`;
        if (uniqueLines.has(key)) {
            ctx.addIssue({ code: 'custom', path: ['items'], message: 'Duplicate cart lines are not allowed' });
            break;
        }
        uniqueLines.add(key);
    }
});

class OrderCreationError extends Error {
    constructor(message: string, readonly status = 400, readonly code = 'INVALID_ORDER') {
        super(message);
    }
}

function numberOrZero(value: unknown): number {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
}

function paymentDetails(method: z.infer<typeof createOrderSchema>['paymentMethod'], transactionCode?: string) {
    switch (method) {
        case 'manual_mpesa':
            return {
                paymentMethod: transactionCode ? `M-Pesa Till (${transactionCode})` : 'M-Pesa Till (Auto-detect)',
                paymentStatus: 'Pending Verification',
                status: 'Pending Payment',
            };
        case 'card':
            return { paymentMethod: 'Card (Paystack)', paymentStatus: 'Unpaid', status: 'Pending Payment' };
        case 'cod':
            return { paymentMethod: 'Cash on Delivery', paymentStatus: 'Unpaid', status: 'Processing' };
        case 'whatsapp':
            return { paymentMethod: 'WhatsApp Order', paymentStatus: 'Pending WhatsApp', status: 'Processing' };
        default:
            return { paymentMethod: 'M-Pesa', paymentStatus: 'Unpaid', status: 'Pending Payment' };
    }
}

export async function POST(request: Request) {
    const authenticated = await requireUser(request);
    if (!authenticated.ok || !authenticated.uid) {
        return NextResponse.json({ success: false, message: authenticated.message || 'Unauthorized' }, { status: 401 });
    }

    try {
        const parsed = createOrderSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({
                success: false,
                code: 'VALIDATION_ERROR',
                message: parsed.error.issues[0]?.message || 'Please check your order details',
                fields: parsed.error.flatten().fieldErrors,
            }, { status: 400 });
        }

        const input = parsed.data;
        const uid = authenticated.uid;
        const normalizedCoupon = input.couponCode?.toUpperCase() || '';
        const zones = await getZonesServer();

        let discountRef: FirebaseFirestore.DocumentReference | null = null;
        if (normalizedCoupon) {
            const discountQuery = await adminDb.collection('discounts')
                .where('code', '==', normalizedCoupon)
                .limit(1)
                .get();
            if (discountQuery.empty) {
                throw new OrderCreationError('This promo code is invalid', 409, 'COUPON_INVALID');
            }
            discountRef = discountQuery.docs[0].ref;

            // Backwards compatibility for usage records created before deterministic IDs.
            const previousUsage = await adminDb.collection('discountUsage')
                .where('userId', '==', uid)
                .where('code', '==', normalizedCoupon)
                .limit(1)
                .get();
            if (!previousUsage.empty) {
                throw new OrderCreationError('You have already used this promo code', 409, 'COUPON_USED');
            }
        }

        const orderRef = adminDb.collection('orders').doc();
        const userRef = adminDb.collection('users').doc(uid);
        const productIds = [...new Set(input.items.map(item => item.id))];
        const productRefs = productIds.map(id => adminDb.collection('products').doc(id));
        const usageRef = discountRef
            ? adminDb.collection('discountUsage').doc(`${uid}_${discountRef.id}`)
            : null;
        const now = new Date();
        const date = now.toISOString();

        const order = await adminDb.runTransaction(async transaction => {
            // Firestore transactions require all reads to complete before any writes.
            const [userSnap, ...productSnaps] = await transaction.getAll(userRef, ...productRefs);
            const discountSnap = discountRef ? await transaction.get(discountRef) : null;
            const usageSnap = usageRef ? await transaction.get(usageRef) : null;

            const products = new Map(productSnaps.map(snapshot => [snapshot.id, snapshot]));
            const quantityByProduct = new Map<string, number>();
            const orderItems = input.items.map(item => {
                const snapshot = products.get(item.id);
                if (!snapshot?.exists) {
                    throw new OrderCreationError('An item in your cart is no longer available', 409, 'PRODUCT_UNAVAILABLE');
                }

                const product: any = snapshot.data();
                if (product.inStock === false) {
                    throw new OrderCreationError(`${product.name || 'This product'} is out of stock`, 409, 'OUT_OF_STOCK');
                }

                const totalForProduct = (quantityByProduct.get(item.id) || 0) + item.quantity;
                quantityByProduct.set(item.id, totalForProduct);

                const productStock = numberOrZero(product.stockQuantity);
                if (productStock < totalForProduct) {
                    throw new OrderCreationError(`Only ${productStock} unit(s) of ${product.name || 'this product'} are available`, 409, 'INSUFFICIENT_STOCK');
                }

                let selectedVariant: any = undefined;
                let unitPrice = numberOrZero(product.price);
                if (item.variantId) {
                    selectedVariant = Array.isArray(product.variants)
                        ? product.variants.find((variant: any) => String(variant.id) === item.variantId)
                        : undefined;
                    if (!selectedVariant) {
                        throw new OrderCreationError(`The selected option for ${product.name || 'this product'} is no longer available`, 409, 'VARIANT_UNAVAILABLE');
                    }
                    const variantStock = numberOrZero(selectedVariant.stockQuantity ?? selectedVariant.stock);
                    if (variantStock < item.quantity) {
                        throw new OrderCreationError(`Only ${variantStock} unit(s) of ${product.name} (${selectedVariant.name}) are available`, 409, 'INSUFFICIENT_STOCK');
                    }
                    unitPrice = selectedVariant.price == null ? unitPrice : numberOrZero(selectedVariant.price);
                }

                if (unitPrice < 0) {
                    throw new OrderCreationError(`${product.name || 'A product'} has an invalid price`, 409, 'INVALID_PRICE');
                }

                return {
                    id: snapshot.id,
                    name: String(product.name || 'Product'),
                    price: unitPrice,
                    quantity: item.quantity,
                    image: product.image || null,
                    ...(selectedVariant ? {
                        selectedVariant: {
                            id: String(selectedVariant.id),
                            name: String(selectedVariant.name || 'Option'),
                            price: unitPrice,
                            stockQuantity: numberOrZero(selectedVariant.stockQuantity ?? selectedVariant.stock),
                            ...(selectedVariant.sku ? { sku: String(selectedVariant.sku) } : {}),
                            ...(selectedVariant.weight != null ? { weight: Number(selectedVariant.weight) } : {}),
                            ...(selectedVariant.image ? { image: String(selectedVariant.image) } : {}),
                        },
                    } : {}),
                };
            });

            const subtotal = Math.round(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0));
            const shippingInfo = input.shippingMethod === 'pickup'
                ? { cost: 0, zoneName: 'Store Pickup', etaText: 'Ready for collection', etaMinDays: 0, etaMaxDays: 0 }
                : getDeliveryCost(input.shipping.county, subtotal, zones);

            const userData: any = userSnap.exists ? userSnap.data() : {};
            const availablePoints = Math.max(0, Math.floor(numberOrZero(userData.loyaltyPoints)));
            const pointsRedeemed = input.redeemPoints ? Math.min(subtotal, availablePoints) : 0;

            let couponDiscount = 0;
            let couponId: string | null = null;
            if (discountSnap && discountRef && usageRef) {
                if (!discountSnap.exists) {
                    throw new OrderCreationError('This promo code is invalid', 409, 'COUPON_INVALID');
                }
                if (usageSnap?.exists) {
                    throw new OrderCreationError('You have already used this promo code', 409, 'COUPON_USED');
                }

                const discount: any = discountSnap.data();
                const expiryMs = discount.expiresAt?.toMillis
                    ? discount.expiresAt.toMillis()
                    : new Date(discount.expiresAt).getTime();
                if (!discount.isActive || (Number.isFinite(expiryMs) && expiryMs < now.getTime())) {
                    throw new OrderCreationError('This promo code has expired or is inactive', 409, 'COUPON_INACTIVE');
                }
                const minimum = Math.max(0, numberOrZero(discount.minOrderValue));
                if (subtotal < minimum) {
                    throw new OrderCreationError(`Minimum order of KES ${minimum.toLocaleString()} required for this code`, 409, 'COUPON_MINIMUM');
                }
                const usedCount = Math.max(0, numberOrZero(discount.usedCount));
                const usageLimit = discount.usageLimit == null ? null : numberOrZero(discount.usageLimit);
                if (usageLimit !== null && usedCount >= usageLimit) {
                    throw new OrderCreationError('This promo code has reached its usage limit', 409, 'COUPON_LIMIT');
                }

                if (discount.type === 'PERCENTAGE') {
                    const percent = Math.min(100, Math.max(0, numberOrZero(discount.value)));
                    couponDiscount = Math.round((subtotal * percent) / 100);
                } else if (discount.type === 'FIXED_AMOUNT') {
                    couponDiscount = Math.min(subtotal, Math.max(0, numberOrZero(discount.value)));
                } else {
                    throw new OrderCreationError('This promo code is misconfigured', 409, 'COUPON_INVALID');
                }
                couponId = discountRef.id;
            }

            const total = Math.max(0, Math.round(subtotal + shippingInfo.cost - pointsRedeemed - couponDiscount));
            if (['mpesa', 'manual_mpesa', 'card'].includes(input.paymentMethod) && total <= 0) {
                throw new OrderCreationError('Choose Cash on Delivery when discounts cover the full order', 409, 'PAYMENT_TOTAL_ZERO');
            }

            const payment = paymentDetails(input.paymentMethod, input.transactionCode);
            const shippingAddress = {
                county: input.shipping.county,
                details: `${input.shipping.address}, ${input.shipping.town}`,
                method: input.shippingMethod,
                ...(input.shipping.lat != null ? { lat: input.shipping.lat } : {}),
                ...(input.shipping.lng != null ? { lng: input.shipping.lng } : {}),
            };
            const reservationMinutes = ['mpesa', 'card'].includes(input.paymentMethod) ? 30 : 24 * 60;
            const inventoryCommitted = input.paymentMethod === 'cod';
            const reservationExpiresAt = new Date(now.getTime() + reservationMinutes * 60_000).toISOString();

            const createdOrder = {
                id: orderRef.id,
                userId: uid,
                userName: input.shipping.fullName,
                userEmail: input.shipping.email || authenticated.email || '',
                phone: input.shipping.phone,
                items: orderItems,
                subtotal,
                shippingCost: shippingInfo.cost,
                shippingMethod: input.shippingMethod,
                shippingZone: shippingInfo.zoneName,
                discountAmount: pointsRedeemed + couponDiscount,
                pointsRedeemed,
                couponDiscount,
                couponCode: normalizedCoupon || null,
                couponId,
                total,
                shippingAddress,
                paymentMethod: payment.paymentMethod,
                paymentStatus: payment.paymentStatus,
                status: payment.status,
                notificationPreferences: ['sms', 'email'],
                date,
                createdAt: date,
                stockReservationStatus: inventoryCommitted ? 'committed' : 'active',
                ...(inventoryCommitted ? {} : { stockReservationExpiresAt: reservationExpiresAt }),
            };

            transaction.set(orderRef, createdOrder);
            transaction.set(adminDb.collection('notifications').doc(), {
                userId: uid,
                message: payment.status === 'Pending Payment'
                    ? `Order #${orderRef.id.slice(0, 5)} is awaiting payment confirmation.`
                    : `Order #${orderRef.id.slice(0, 5)} has been placed successfully!`,
                date,
                read: false,
                type: 'order',
            });

            for (const productId of productIds) {
                const snapshot = products.get(productId)!;
                const product: any = snapshot.data();
                const quantity = quantityByProduct.get(productId) || 0;
                const previousStock = numberOrZero(product.stockQuantity);
                const nextStock = previousStock - quantity;
                const variants = Array.isArray(product.variants) ? product.variants.map((variant: any) => {
                    const line = input.items.find(item => item.id === productId && item.variantId === String(variant.id));
                    return line
                        ? { ...variant, stockQuantity: numberOrZero(variant.stockQuantity ?? variant.stock) - line.quantity }
                        : variant;
                }) : undefined;

                transaction.update(snapshot.ref, {
                    stockQuantity: nextStock,
                    inStock: nextStock > 0,
                    ...(variants ? { variants } : {}),
                });
                transaction.set(adminDb.collection('inventory_history').doc(), {
                    productId,
                    productName: String(product.name || 'Product'),
                    previousStock,
                    newStock: nextStock,
                    change: -quantity,
                    updatedBy: 'System (Secure Checkout)',
                    updatedAt: date,
                    orderId: orderRef.id,
                });
            }

            if (discountRef && usageRef) {
                transaction.update(discountRef, { usedCount: admin.firestore.FieldValue.increment(1) });
                transaction.create(usageRef, {
                    userId: uid,
                    discountId: discountRef.id,
                    code: normalizedCoupon,
                    orderId: orderRef.id,
                    amount: couponDiscount,
                    usedAt: date,
                });
            }

            const existingAddresses = Array.isArray(userData.savedAddresses) ? userData.savedAddresses : [];
            const addressKey = `${input.shipping.county.toLowerCase()}|${shippingAddress.details.toLowerCase()}`;
            const addressExists = existingAddresses.some((address: any) =>
                `${String(address.county || '').toLowerCase()}|${String(address.details || '').toLowerCase()}` === addressKey
            );
            const savedAddresses = addressExists ? existingAddresses : [...existingAddresses, {
                id: `addr_${orderRef.id}`,
                label: input.shippingMethod === 'pickup' ? 'Pickup' : existingAddresses.length === 0 ? 'Default' : `Address ${existingAddresses.length + 1}`,
                county: input.shipping.county,
                city: input.shipping.town,
                details: shippingAddress.details,
                ...(input.shipping.lat != null ? { lat: input.shipping.lat } : {}),
                ...(input.shipping.lng != null ? { lng: input.shipping.lng } : {}),
                isPrimary: existingAddresses.length === 0,
                savedAt: date,
            }];
            transaction.set(userRef, {
                name: userData.name || input.shipping.fullName,
                email: userData.email || input.shipping.email || authenticated.email || '',
                phone: input.shipping.phone,
                address: input.shipping.address,
                city: input.shipping.town,
                county: input.shipping.county,
                role: userData.role || 'user',
                loyaltyPoints: availablePoints - pointsRedeemed,
                savedAddresses,
                preferredPaymentMethod: input.paymentMethod,
                lastOrderAt: date,
                updatedAt: date,
                ...(!userSnap.exists ? { createdAt: date } : {}),
            }, { merge: true });

            return createdOrder;
        });

        try {
            const confirmation = CommunicationTemplates.getOrderConfirmation(order as any);
            const notifications: Promise<unknown>[] = [];
            if (order.phone) notifications.push(sendServerSms(order.phone, confirmation.smsBody));
            if (order.userEmail) notifications.push(sendServerEmail(order.userEmail, confirmation.subject, confirmation.emailBody));
            await Promise.allSettled(notifications);
        } catch (notificationError) {
            console.warn('Order confirmation notification failed (non-fatal):', notificationError);
        }

        return NextResponse.json({ success: true, order }, { status: 201 });
    } catch (error: any) {
        const known = error instanceof OrderCreationError;
        console.error('Secure order creation failed:', error);
        return NextResponse.json({
            success: false,
            code: known ? error.code : 'ORDER_CREATE_FAILED',
            message: known ? error.message : 'We could not place your order. Please try again.',
        }, { status: known ? error.status : 500 });
    }
}
