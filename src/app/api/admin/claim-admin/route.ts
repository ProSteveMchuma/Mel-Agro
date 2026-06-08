import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { requireUser } from '@/lib/auth-server';

export async function POST(request: Request) {
    const auth = await requireUser(request);
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: 401 });
    }

    try {
        const { secretCode } = await request.json();
        const expected = process.env.ADMIN_SECRET_CODE;

        if (!expected) {
            return NextResponse.json(
                { success: false, message: 'Admin claim is not configured on this server' },
                { status: 503 }
            );
        }

        if (!secretCode || typeof secretCode !== 'string' || secretCode !== expected) {
            return NextResponse.json(
                { success: false, message: 'Invalid security code' },
                { status: 403 }
            );
        }

        const userRef = adminDb.collection('users').doc(auth.uid!);
        const userSnap = await userRef.get();

        if (userSnap.exists) {
            await userRef.update({
                role: 'admin',
                updatedAt: new Date().toISOString(),
                adminClaimedAt: new Date().toISOString(),
            });
        } else {
            await userRef.set({
                email: auth.email || '',
                role: 'admin',
                createdAt: new Date().toISOString(),
                adminClaimedAt: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            success: true,
            message: 'You are now an admin. Redirecting...',
        });
    } catch (error: any) {
        console.error('Claim Admin Error:', error);
        return NextResponse.json(
            { success: false, message: error?.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
