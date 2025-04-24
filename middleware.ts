import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_CONFIG } from './config/auth.config';

export function middleware(request: NextRequest) {
  // Get token from cookies
  const token = request.cookies.get(AUTH_CONFIG.COOKIE_NAME)?.value;
  const timestamp = new Date().toISOString();
  const ip = request.ip || 'unknown';

  // Log request to root path
  if (request.nextUrl.pathname === '/' && process.env.NODE_ENV === 'production') {
    console.log(`[${timestamp}] Request to / from IP: ${ip}`);
  }
  
  // Debug routes - allow access without authentication
  if (request.nextUrl.pathname.startsWith('/debug') || 
      request.nextUrl.pathname.startsWith('/api/debug')) {
    console.log(`[${timestamp}] 调试访问: ${request.nextUrl.pathname}`);
    return NextResponse.next();
  }

  // API routes - all need authentication
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Skip auth for login/logout/check routes
    if (
      request.nextUrl.pathname === '/api/auth/login' ||
      request.nextUrl.pathname === '/api/auth/logout' ||
      request.nextUrl.pathname === '/api/auth/check'
    ) {
      return NextResponse.next();
    }
    
    // If no token, return unauthorized
    if (!token) {
      console.log(`[${timestamp}] 未授权API访问: ${request.nextUrl.pathname}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Token exists, let the API route validate it
    return NextResponse.next();
  }

  // Skip authentication for login page and related resources
  if (
    request.nextUrl.pathname === '/login' || 
    request.nextUrl.pathname === '/api/auth/login' ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.includes('.') // Skip for static files
  ) {
    return NextResponse.next();
  }

  // For all other pages, check if user is authenticated
  // If not, redirect to login page
  if (!token) {
    console.log(`[${timestamp}] 未授权页面访问: ${request.nextUrl.pathname}, 重定向到登录页面`);
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Configure which paths the middleware will run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 