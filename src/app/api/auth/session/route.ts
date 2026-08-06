import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { enforceRateLimit } from '@/lib/request-guard';

const SESSION_COOKIE = 'melagri_session';
const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
    const limited = enforceRateLimit(request, 'auth-session', 10, 10 * 60_000);
    if (limited) return limited;

    try {
        const { idToken } = await request.json();
        if (!idToken || typeof idToken !== 'string') {
            return NextResponse.json({ success: false, message: 'A valid ID token is required' }, { status: 400 });
        }

        const decoded = await adminAuth.verifyIdToken(idToken);
        const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
        const role = userSnap.data()?.role;
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });

        const response = NextResponse.json({
            success: true,
            role: role === 'admin' || role === 'super-admin' ? role : 'user',
        });
        response.cookies.set(SESSION_COOKIE, sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_MAX_AGE_MS / 1000,
        });
        return response;
    } catch {
        return NextResponse.json({ success: false, message: 'Unable to create session' }, { status: 401 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
    return response;
}

export async function GET(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const sessionCookie = cookieHeader
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
        ?.slice(SESSION_COOKIE.length + 1);

    if (!sessionCookie) {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    try {
        const decoded = await adminAuth.verifySessionCookie(decodeURIComponent(sessionCookie), true);
        const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
        const role = userSnap.data()?.role;
        if (role !== 'admin' && role !== 'super-admin') {
            return NextResponse.json({ authenticated: true, authorized: false }, { status: 403 });
        }
        return NextResponse.json({ authenticated: true, authorized: true });
    } catch {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}
