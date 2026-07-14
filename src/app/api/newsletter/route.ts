import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const email = String(body.email || '').trim().toLowerCase();
        const source = String(body.source || 'website').slice(0, 40);

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
            return NextResponse.json({ message: 'Enter a valid email address.' }, { status: 400 });
        }

        const subscriberId = createHash('sha256').update(email).digest('hex');
        await adminDb.collection('newsletter_subscribers').doc(subscriberId).set({
            email,
            source,
            status: 'subscribed',
            consent: true,
            subscribedAt: new Date().toISOString(),
        }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Newsletter signup failed:', error);
        return NextResponse.json({ message: 'Signup is temporarily unavailable. Please try again.' }, { status: 503 });
    }
}
