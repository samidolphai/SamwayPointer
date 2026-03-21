import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET ?? 'dev-secret-change-in-production-32chars!'
);

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get('admin_session')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow login and password-reset endpoints (unauthenticated)
  if (
    pathname === '/admin/login' ||
    pathname === '/api/admin/login' ||
    pathname === '/api/admin/reset-password' ||
    pathname === '/api/pwa-icon' ||
    pathname.startsWith('/api/pwa-icon/')
  ) {
    return NextResponse.next();
  }

  const authed = await isAuthenticated(req);

  if (!authed) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect admin UI, records API, employees API, and verification logs API
  matcher: [
    '/admin/:path*',
    '/api/records/:path*',
    '/api/employees/:path*',
    '/api/verify/logs/:path*',
  ],
};
