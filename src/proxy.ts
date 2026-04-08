import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userRole = request.cookies.get('userRole')?.value;
  const pathname = request.nextUrl.pathname;

  // Protected dashboard routes
  const protectedRoutes: Record<string, string[]> = {
    '/dashboard/admin': ['admin', 'co-admin'],
    '/dashboard/manager': ['manager'],
    '/dashboard/store': ['store'],
    '/dashboard/delivery': ['delivery'],
  };

  for (const [route, roles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!userRole) {
        return NextResponse.redirect(new URL('/', request.url));
      }
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

  // Customer routes — allow guests too (no redirect for unauthenticated)
  const customerOnlyRoutes = ['/checkout', '/orders'];
  const isCustomerOnly = customerOnlyRoutes.some((r) => pathname.startsWith(r));

  if (isCustomerOnly && userRole && !['customer', 'admin', 'co-admin'].includes(userRole)) {
    const redirectMap: Record<string, string> = {
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
    '/checkout/:path*',
    '/orders/:path*',
  ],
};