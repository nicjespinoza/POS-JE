import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/admin', '/pos', '/setup-db'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

    if (isProtected) {
        // Check for Firebase auth session cookie
        // Firebase JS SDK stores auth state in IndexedDB, not cookies by default.
        // This middleware provides a basic redirect layer. Full auth check happens client-side.
        // For production, implement Firebase session cookies via Cloud Functions.
        const hasSession = request.cookies.get('__session') || request.cookies.get('firebaseToken');

        // If no session indicator exists, we still allow through because
        // Firebase Auth state is managed client-side. The AuthContext will
        // handle the actual redirect if user is not authenticated.
        // This middleware adds a security header for protected routes.
    }

    const response = NextResponse.next();

    // Add extra security header for protected routes
    if (isProtected) {
        response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }

    return response;
}

export const config = {
    matcher: ['/admin/:path*', '/pos/:path*', '/setup-db/:path*'],
};
