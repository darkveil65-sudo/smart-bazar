import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userRole = request.cookies.get('userRole')?.value;
  const pathname = request.nextUrl.pathname;

  // Define protected routes based on role
  const protectedRoutes: Record<string, string[]> = {
    '/dashboard/admin': ['admin', 'co-admin'],
    '/dashboard/manager': ['manager'],
    '/dashboard/store': ['store'],
    '/dashboard/delivery': ['delivery'],
  };

  // Check if the pathname matches any protected route
  for (const [route, roles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      // If no user role, redirect to login
      if (!userRole) {
        return NextResponse.redirect(new URL('/', request.url));
      }
      
      // If user role is not in allowed roles, redirect to appropriate dashboard
      if (!roles.includes(userRole)) {
        const redirectMap: Record<string, string> = {
          admin: '/dashboard/admin',
          'co-admin': '/dashboard/admin',
          manager: '/dashboard/manager',
          store: '/dashboard/store',
          delivery: '/dashboard/delivery',
          customer: '/home',
        };
        return NextResponse.redirect(new URL(redirectMap[userRole] || '/', request.url));
      }
    }
  }

  // Customer-only routes
  const customerRoutes = ['/home', '/cart', '/checkout', '/order-confirmation', '/order-tracking'];
  const isCustomerRoute = customerRoutes.some(route => pathname.startsWith(route));
  
  if (isCustomerRoute && userRole && !['customer', 'admin', 'co-admin'].includes(userRole)) {
    // Redirect non-customers away from customer routes
    const redirectMap: Record<string, string> = {
      admin: '/dashboard/admin',
      'co-admin': '/dashboard/admin',
      manager: '/dashboard/manager',
      store: '/dashboard/store',
      delivery: '/dashboard/delivery',
    };
    return NextResponse.redirect(new URL(redirectMap[userRole] || '/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/home/:path*',
    '/cart/:path*',
    '/checkout/:path*',
    '/order-confirmation/:path*',
    '/order-tracking/:path*',
  ],
};