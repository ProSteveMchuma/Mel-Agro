import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Get the pathname of the request (e.g. /, /dashboard/admin)
    const path = request.nextUrl.pathname;

    // Define paths that are protected
    const isProtectedPath = path.startsWith('/dashboard/admin');

    // Note: For a client-side Firebase app, server middleware has limited visibility into Auth state
    // without a custom cookie implementation. Full authentication checks happen in AuthContext.
    // This middleware serves as a basic path validation layer.
    // For production, consider implementing server-side session tokens in cookies.

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/admin/:path*',
    ],
};
