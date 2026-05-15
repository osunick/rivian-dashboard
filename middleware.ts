import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'rivian_auth';
const LOGIN_PATH = '/login';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login page and API route through
  if (pathname === LOGIN_PATH || pathname === '/api/login') {
    return NextResponse.next();
  }

  // Check auth cookie
  const auth = req.cookies.get(AUTH_COOKIE);
  if (auth?.value === 'true') {
    return NextResponse.next();
  }

  // Redirect to login
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = LOGIN_PATH;
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
