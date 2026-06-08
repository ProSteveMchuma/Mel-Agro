import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            name,
            organisation,
            email,
            phone,
            county,
            estimatedValue,
            categories,
            timeline,
            message,
        } = body || {};

        if (!name || !phone || (!email && !phone)) {
            return NextResponse.json(
                { success: false, message: 'Name, phone, and email are required' },
                { status: 400 }
            );
        }

        if (typeof name !== 'string' || name.length > 200) {
            return NextResponse.json({ success: false, message: 'Invalid name' }, { status: 400 });
        }
        if (message && (typeof message !== 'string' || message.length > 5000)) {
            return NextResponse.json({ success: false, message: 'Message too long' }, { status: 400 });
        }
        const cleanPhone = String(phone).replace(/\s+/g, '');
        if (cleanPhone.length < 9 || cleanPhone.length > 15) {
            return NextResponse.json({ success: false, message: 'Invalid phone' }, { status: 400 });
        }
        if (email && typeof email === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json({ success: false, message: 'Invalid email' }, { status: 400 });
        }

        const docRef = await adminDb.collection('bulkInquiries').add({
            name: String(name).slice(0, 200).trim(),
            organisation: organisation ? String(organisation).slice(0, 200).trim() : null,
            email: email ? String(email).slice(0, 200).trim().toLowerCase() : null,
            phone: cleanPhone,
            county: county ? String(county).slice(0, 100) : null,
            estimatedValue: Number(estimatedValue) || null,
            categories: Array.isArray(categories) ? categories.slice(0, 20).map(String) : [],
            timeline: timeline ? String(timeline).slice(0, 100) : null,
            message: message ? String(message).slice(0, 5000).trim() : '',
            status: 'New',
            submittedAt: new Date().toISOString(),
            source: 'bulk-page-form',
        });

        return NextResponse.json({
            success: true,
            id: docRef.id,
            message: 'Thanks! Our sales team will reach out within 24 hours.',
        });
    } catch (error: any) {
        console.error('Bulk Inquiry Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to submit. Please try again or call us directly.' },
            { status: 500 }
        );
    }
}
