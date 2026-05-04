import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireAdmin } from '@/lib/auth-server';
import { registerC2BUrls } from '@/lib/mpesa';

export async function POST(request: Request) {
    try {
        const auth = await requireAdmin(request);
        if (!auth.ok) {
            return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const baseUrl = body.baseUrl || process.env.NEXT_PUBLIC_BASE_URL;
        const responseType = body.responseType || 'Completed';

        if (!baseUrl) {
            return NextResponse.json(
                { success: false, message: 'baseUrl required (or set NEXT_PUBLIC_BASE_URL)' },
                { status: 400 }
            );
        }

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
            raw: data,
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
    const auth = await requireAdmin(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }

    try {
        const snap = await adminDb.collection('mpesaConfig').doc('c2b').get();
        if (!snap.exists) {
            return NextResponse.json({ success: true, registered: false });
        }
        return NextResponse.json({
            success: true,
            registered: true,
            ...snap.data(),
        });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
