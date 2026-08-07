import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requirePermission } from '@/lib/auth-server';
import { registerC2BUrls } from '@/lib/mpesa-server';

export async function POST(request: Request) {
    try {
        const auth = await requirePermission(request, 'payments.manage');
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const baseUrl = String(body.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || '').trim();
        const responseType = body.responseType === 'Cancelled' ? 'Cancelled' : 'Completed';

        if (!baseUrl) {
            return NextResponse.json(
                { success: false, message: 'baseUrl required (or set NEXT_PUBLIC_BASE_URL)' },
                { status: 400 }
            );
        }
        let callbackOrigin: URL;
        try { callbackOrigin = new URL(baseUrl); } catch { return NextResponse.json({ success: false, message: 'Enter a valid deployed site URL.' }, { status: 400 }); }
        if (callbackOrigin.protocol !== 'https:' && process.env.MPESA_ENV === 'production') return NextResponse.json({ success: false, message: 'Production callback URLs must use HTTPS.' }, { status: 400 });
        if (callbackOrigin.username || callbackOrigin.password || callbackOrigin.pathname !== '/' || callbackOrigin.search || callbackOrigin.hash) return NextResponse.json({ success: false, message: 'Enter only the site origin, for example https://melagri.com.' }, { status: 400 });

        const confirmationURL = `${baseUrl.replace(/\/$/, '')}/api/payment/mpesa/c2b-confirmation`;
        const validationURL = `${baseUrl.replace(/\/$/, '')}/api/payment/mpesa/c2b-validation`;

        if (!process.env.MPESA_CONSUMER_KEY) {
            return NextResponse.json({
                success: false,
                message: 'M-Pesa not configured',
            }, { status: 503 });
        }

        const data = await registerC2BUrls({
            confirmationURL,
            validationURL,
            responseType,
        });

        const success = data.ResponseCode === '0' || data.ResponseDescription?.toLowerCase().includes('success');

        await adminDb.collection('mpesaConfig').doc('c2b').set({
            confirmationURL,
            validationURL,
            responseType,
            shortCode: process.env.MPESA_SHORTCODE,
            registeredAt: new Date().toISOString(),
            registeredBy: auth.uid,
            registeredByEmail: auth.email,
            response: data,
            success,
        }, { merge: true });

        return NextResponse.json({
            success,
            message: data.ResponseDescription || data.errorMessage || (success ? 'C2B URLs registered' : 'Registration may have failed'),
            confirmationURL,
            validationURL,
            providerCode: data.ResponseCode || null,
        }, { status: success ? 200 : 400 });
    } catch (error: any) {
        console.error('C2B Register Error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    const auth = await requirePermission(request, 'payments.manage');
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }

    try {
        const snap = await adminDb.collection('mpesaConfig').doc('c2b').get();
        if (!snap.exists) {
            return NextResponse.json({ success: true, registered: false });
        }
        const saved = snap.data() || {};
        return NextResponse.json({
            success: true,
            registered: true,
            confirmationURL: saved.confirmationURL || null,
            validationURL: saved.validationURL || null,
            responseType: saved.responseType || null,
            registeredAt: saved.registeredAt || null,
            registrationSuccessful: saved.success === true,
            environment: process.env.MPESA_ENV === 'production' ? 'production' : 'sandbox',
            configured: {
                consumerCredentials: Boolean(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET),
                stkPush: Boolean(process.env.MPESA_SHORTCODE && process.env.MPESA_PASSKEY),
                tillNumber: Boolean(process.env.MPESA_TILL_NUMBER),
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
