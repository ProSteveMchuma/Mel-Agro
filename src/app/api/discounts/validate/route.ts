import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser } from '@/lib/auth-server';

export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }

    try {
        const { code, cartTotal } = await request.json();

        if (!code) {
            return NextResponse.json({ success: false, message: 'Discount code required' }, { status: 400 });
        }

        const normalized = String(code).trim().toUpperCase();
        const snap = await adminDb
            .collection('discounts')
            .where('code', '==', normalized)
            .limit(1)
            .get();

        if (snap.empty) {
            return NextResponse.json({ success: false, message: 'Invalid promo code' }, { status: 404 });
        }

        const docSnap = snap.docs[0];
        const discount: any = docSnap.data();

        if (!discount.isActive) {
            return NextResponse.json({ success: false, message: 'This promo code is no longer active' }, { status: 410 });
        }

        const expiresAtMs = discount.expiresAt?.toMillis ? discount.expiresAt.toMillis() : new Date(discount.expiresAt).getTime();
        if (Number.isFinite(expiresAtMs) && expiresAtMs < Date.now()) {
            return NextResponse.json({ success: false, message: 'This promo code has expired' }, { status: 410 });
        }

        const total = Number(cartTotal) || 0;
        const min = Number(discount.minOrderValue) || 0;
        if (min > 0 && total < min) {
            return NextResponse.json({
                success: false,
                message: `Minimum order of KES ${min.toLocaleString()} required for this code`,
            }, { status: 400 });
        }

        if (Number.isFinite(discount.usageLimit) && discount.usageLimit !== null) {
            const usedCount = Number(discount.usedCount) || 0;
            if (usedCount >= discount.usageLimit) {
                return NextResponse.json({
                    success: false,
                    message: 'This promo code has reached its usage limit',
                }, { status: 410 });
            }
        }

        const userUsageSnap = await adminDb
            .collection('discountUsage')
            .where('userId', '==', auth.uid)
            .where('code', '==', normalized)
            .limit(1)
            .get();
        if (!userUsageSnap.empty) {
            return NextResponse.json({
                success: false,
                message: 'You have already used this promo code',
            }, { status: 409 });
        }

        let discountAmount = 0;
        if (discount.type === 'PERCENTAGE') {
            discountAmount = Math.round((total * Number(discount.value)) / 100);
        } else if (discount.type === 'FIXED_AMOUNT') {
            discountAmount = Math.min(total, Number(discount.value));
        }

        return NextResponse.json({
            success: true,
            discount: {
                id: docSnap.id,
                code: normalized,
                type: discount.type,
                value: Number(discount.value),
                amount: discountAmount,
            },
            message: `Code applied — you save KES ${discountAmount.toLocaleString()}`,
        });
    } catch (error: any) {
        console.error('Discount Validate Error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
