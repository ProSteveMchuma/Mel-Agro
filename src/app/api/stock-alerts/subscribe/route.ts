import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';
import { enforceRateLimit } from '@/lib/request-guard';
import { reportIncident } from '@/lib/incident-reporting';
import { normalizeKenyanPhone } from '@/lib/account-upgrade';
import { phoneAccessKey } from '@/lib/order-access';
import { requireUser } from '@/lib/auth-server';

const schema = z.object({
    productId: z.string().trim().min(1).max(120),
    productName: z.string().trim().max(200).optional().default(''),
    phone: z.string().trim().min(9).max(20),
    website: z.string().max(500).optional().default(''),
});

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'stock-alert-subscribe', 8, 60 * 60_000);
    if (limited) return limited;

    try {
        const parsed = schema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Enter a valid Kenyan phone number for this product.' },
                { status: 400 },
            );
        }

        if (parsed.data.website) {
            return NextResponse.json({ success: true, message: 'We will notify you when this is back in stock.' });
        }

        let phoneE164: string;
        try {
            phoneE164 = normalizeKenyanPhone(parsed.data.phone);
        } catch {
            return NextResponse.json(
                { success: false, message: 'Enter a valid Kenyan phone number (e.g. 07XX XXX XXX).' },
                { status: 400 },
            );
        }

        const productId = parsed.data.productId;
        const productSnap = await adminDb.collection('products').doc(productId).get();
        if (!productSnap.exists) {
            return NextResponse.json({ success: false, message: 'Product not found.' }, { status: 404 });
        }

        const product = productSnap.data() || {};
        const stock = Number(product.stockQuantity ?? product.stock ?? 0);
        if (product.inStock !== false && stock > 0) {
            return NextResponse.json(
                { success: false, message: 'This product is already in stock — you can add it to your cart.' },
                { status: 409 },
            );
        }

        const auth = await requireUser(request);
        const phoneKey = phoneAccessKey(phoneE164);
        const id = createHash('sha256').update(`${productId}:${phoneKey}`).digest('hex').slice(0, 40);
        const ref = adminDb.collection('stockAlertSubscriptions').doc(id);
        const existing = await ref.get();
        const now = new Date().toISOString();

        await ref.set({
            productId,
            productName: parsed.data.productName || String(product.name || 'Product'),
            phone: phoneE164,
            phoneKey,
            userId: auth.ok ? auth.uid : null,
            status: 'active',
            source: 'pdp',
            consentText: 'Notify me by SMS or WhatsApp when this product is back in stock.',
            subscribedAt: existing.data()?.subscribedAt || now,
            updatedAt: now,
        }, { merge: true });

        return NextResponse.json({
            success: true,
            message: existing.exists
                ? 'You are already on the waitlist for this product.'
                : 'Got it — we will notify you when this is back in stock.',
        });
    } catch (error) {
        void reportIncident({
            type: 'notification_failure',
            severity: 'warning',
            source: 'stock-alert-subscribe',
            message: 'Back-in-stock subscription storage failed',
        });
        console.error('Stock alert subscribe error:', error instanceof Error ? error.message : 'unknown');
        return NextResponse.json(
            { success: false, message: 'We could not save your request. Please try again.' },
            { status: 500 },
        );
    }
}
