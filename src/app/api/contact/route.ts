import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { enforceRateLimit } from '@/lib/request-guard';

const SUBJECTS = new Set(['General Inquiry', 'Order Issue', 'Partnership', 'Feedback']);

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'contact-form', 5, 60 * 60_000);
    if (limited) return limited;

    try {
        const body = await request.json().catch(() => null);
        const name = String(body?.name || '').trim();
        const email = String(body?.email || '').trim().toLowerCase();
        const phone = String(body?.phone || '').replace(/[\s()-]/g, '');
        const subject = SUBJECTS.has(String(body?.subject || '')) ? String(body.subject) : 'General Inquiry';
        const message = String(body?.message || '').trim();

        if (name.length < 2 || name.length > 80) {
            return NextResponse.json({ success: false, message: 'Enter your name' }, { status: 400 });
        }
        if (message.length < 10 || message.length > 5000) {
            return NextResponse.json({ success: false, message: 'Enter a message of at least 10 characters' }, { status: 400 });
        }
        if (!email && !phone) {
            return NextResponse.json({ success: false, message: 'Add an email or phone number so we can reply' }, { status: 400 });
        }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ success: false, message: 'Enter a valid email address' }, { status: 400 });
        }
        if (phone && (phone.length < 9 || phone.length > 16)) {
            return NextResponse.json({ success: false, message: 'Enter a valid phone number' }, { status: 400 });
        }

        const docRef = await adminDb.collection('contactMessages').add({
            name: name.slice(0, 80),
            email: email || null,
            phone: phone || null,
            subject,
            message: message.slice(0, 5000),
            status: 'New',
            submittedAt: new Date().toISOString(),
            source: 'contact-page',
        });

        return NextResponse.json({
            success: true,
            id: docRef.id,
            message: 'Thanks — we received your message and will reply by phone, SMS, or WhatsApp.',
        });
    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { success: false, message: 'Could not send the message. Please try WhatsApp or call us.' },
            { status: 500 },
        );
    }
}
