import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    const sessionCookie = request.cookies.get('melagri_session')?.value;
    if (!sessionCookie) {
        return NextResponse.redirect(new URL('/auth/login?callbackUrl=/dashboard/admin', request.url));
    }

    try {
        const verificationUrl = new URL('/api/auth/session', request.url);
        const verification = await fetch(verificationUrl, {
            method: 'GET',
            headers: { cookie: request.headers.get('cookie') || '' },
            cache: 'no-store',
        });
        if (verification.status === 403) {
            return NextResponse.redirect(new URL('/dashboard/user', request.url));
        }
        if (!verification.ok) throw new Error('Invalid session');
        return NextResponse.next();
    } catch {
        const response = NextResponse.redirect(new URL('/auth/login?callbackUrl=/dashboard/admin', request.url));
        response.cookies.delete('melagri_session');
        return response;
    }
}

export const config = {
    matcher: ['/dashboard/admin/:path*'],
};
