import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { requireOrderOwnerOrAdmin } from '@/lib/auth-server';
import { CommunicationTemplates } from '@/lib/communication-templates';
import { isCustomerCancellable, withActionUrls } from '@/lib/order-access';
import { authorizeOrderAction } from '@/lib/order-access-server';
import { notifyCustomer } from '@/lib/customer-notifications';
import { revalidateStorefrontCatalogue } from '@/lib/revalidate-catalogue';
import { enforceRateLimit } from '@/lib/request-guard';

const cancelSchema = z.object({
    orderId: z.string().trim().min(1).max(200),
    accessToken: z.string().trim().min(1).max(500).optional(),
});

function numberOrZero(value: unknown): number {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
}

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'order-cancel', 20, 60_000);
    if (limited) return limited;

    try {
        const parsed = cancelSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json({ success: false, message: 'A valid order ID is required' }, { status: 400 });
        }

        const { orderId, accessToken } = parsed.data;

        const owner = await requireOrderOwnerOrAdmin(request, orderId);
        let actorId: string | null = owner.ok && owner.uid ? owner.uid : null;
        let isAdmin = Boolean(owner.ok && owner.isAdmin);

        if (!actorId) {
            const linkAuth = await authorizeOrderAction({
                request,
                orderId,
                action: 'view',
                acceptActions: ['view', 'pay'],
                accessToken,
            });
            if (!linkAuth.ok) {
                const status = linkAuth.status === 404 ? 404 : 403;
                return NextResponse.json(
                    { success: false, message: linkAuth.message || 'Sign in or use a valid order link from your SMS' },
                    { status },
                );
            }
            actorId = linkAuth.via === 'auth' && 'uid' in linkAuth && linkAuth.uid
                ? String(linkAuth.uid)
                : 'customer-link';
            isAdmin = false;
        }

        const orderRef = adminDb.collection('orders').doc(orderId);
        const outcome = await adminDb.runTransaction(async transaction => {
            const initialOrderSnap = await transaction.get(orderRef);
            if (!initialOrderSnap.exists) throw new Error('ORDER_NOT_FOUND');
            const order: any = initialOrderSnap.data();

            if (!isAdmin && actorId !== 'customer-link' && order.userId !== actorId) {
                throw new Error('FORBIDDEN');
            }
            if (order.status === 'Cancelled' && order.stockRestored) return { alreadyCancelled: true, order: null };

            const cancellable = isCustomerCancellable(order);
            if (!cancellable.ok) {
                if (order.paymentStatus === 'Paid') throw new Error('PAID_ORDER');
                throw new Error('STATUS_NOT_CANCELLABLE');
            }

            const items = Array.isArray(order.items) ? order.items : [];
            const productIds: string[] = [...new Set<string>(items.map((item: any) => String(item.id)))];
            const productRefs = productIds.map(id => adminDb.collection('products').doc(id));
            const userRef = adminDb.collection('users').doc(String(order.userId));
            const discountRef = order.couponId ? adminDb.collection('discounts').doc(String(order.couponId)) : null;
            const usageRef = discountRef
                ? adminDb.collection('discountUsage').doc(`${order.userId}_${discountRef.id}`)
                : null;

            const readRefs = [userRef, ...productRefs, ...(discountRef ? [discountRef] : []), ...(usageRef ? [usageRef] : [])];
            const readSnaps = await transaction.getAll(...readRefs);
            const userSnap = readSnaps[0];
            const productSnaps = readSnaps.slice(1, 1 + productRefs.length);
            const discountSnap = discountRef ? readSnaps[1 + productRefs.length] : null;
            const usageSnap = usageRef ? readSnaps[1 + productRefs.length + (discountRef ? 1 : 0)] : null;
            const now = new Date().toISOString();

            for (const snapshot of productSnaps) {
                if (!snapshot.exists) continue;
                const product: any = snapshot.data();
                const productItems = items.filter((item: any) => String(item.id) === snapshot.id);
                const quantity = productItems.reduce((sum: number, item: any) => sum + Math.max(0, numberOrZero(item.quantity)), 0);
                const previousStock = numberOrZero(product.stockQuantity);
                const nextStock = previousStock + quantity;
                const variants = Array.isArray(product.variants) ? product.variants.map((variant: any) => {
                    const restoredQuantity = productItems
                        .filter((item: any) => String(item.selectedVariant?.id || '') === String(variant.id))
                        .reduce((sum: number, item: any) => sum + Math.max(0, numberOrZero(item.quantity)), 0);
                    return restoredQuantity > 0
                        ? { ...variant, stockQuantity: numberOrZero(variant.stockQuantity ?? variant.stock) + restoredQuantity }
                        : variant;
                }) : undefined;

                transaction.update(snapshot.ref, {
                    stockQuantity: nextStock,
                    inStock: nextStock > 0,
                    ...(variants ? { variants } : {}),
                });
                transaction.set(adminDb.collection('inventory_history').doc(), {
                    productId: snapshot.id,
                    productName: String(product.name || productItems[0]?.name || 'Product'),
                    previousStock,
                    newStock: nextStock,
                    change: quantity,
                    updatedBy: `System (Cancellation by ${actorId})`,
                    updatedAt: now,
                    orderId,
                });
            }

            const pointsRedeemed = Math.max(0, numberOrZero(order.pointsRedeemed));
            if (pointsRedeemed > 0) {
                const currentPoints = userSnap.exists ? numberOrZero(userSnap.data()?.loyaltyPoints) : 0;
                transaction.set(userRef, { loyaltyPoints: currentPoints + pointsRedeemed, updatedAt: now }, { merge: true });
            }

            if (discountRef && discountSnap?.exists) {
                const currentUses = Math.max(0, numberOrZero(discountSnap.data()?.usedCount));
                transaction.update(discountRef, { usedCount: Math.max(0, currentUses - 1) });
                if (usageRef && usageSnap?.exists) transaction.delete(usageRef);
            }

            transaction.update(orderRef, {
                status: 'Cancelled',
                stockRestored: true,
                stockRestoredAt: now,
                stockReservationStatus: 'released',
                cancelledAt: now,
                cancelledBy: actorId,
            });

            return { alreadyCancelled: false, order: { id: orderId, ...order, status: 'Cancelled' } };
        });

        if (!outcome.alreadyCancelled && outcome.order) {
            revalidateStorefrontCatalogue();
            try {
                const tpl = CommunicationTemplates.getStatusUpdate(await withActionUrls(outcome.order as any), 'Cancelled');
                await notifyCustomer({
                    userId: outcome.order.userId,
                    phone: outcome.order.mpesaPhoneNumber || outcome.order.phone,
                    message: tpl.smsBody,
                    orderId,
                });
            } catch (error) {
                console.warn('Cancel customer notification failed (non-fatal):', error);
            }
        }

        return NextResponse.json({ success: true, alreadyCancelled: outcome.alreadyCancelled });
    } catch (error: any) {
        const code = error?.message;
        if (code === 'ORDER_NOT_FOUND') {
            return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
        }
        if (code === 'FORBIDDEN') {
            return NextResponse.json({ success: false, message: 'You cannot cancel this order' }, { status: 403 });
        }
        if (code === 'STATUS_NOT_CANCELLABLE') {
            return NextResponse.json({ success: false, message: 'This order can no longer be cancelled online' }, { status: 409 });
        }
        if (code === 'PAID_ORDER') {
            return NextResponse.json({ success: false, message: 'Paid orders require support assistance for cancellation and refund' }, { status: 409 });
        }
        console.error('Secure order cancellation failed:', error);
        return NextResponse.json({ success: false, message: 'We could not cancel this order. Please try again.' }, { status: 500 });
    }
}
