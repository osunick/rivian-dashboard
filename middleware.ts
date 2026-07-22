import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, verifyAuthToken } from './lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isLoginPage = pathname === '/login';
  const isLoginApi = pathname === '/api/login';
  const isPublicAmbientRoute = pathname === '/screencatcher';

  if (isLoginApi || isPublicAmbientRoute) return NextResponse.next();

  const authenticated = await verifyAuthToken(req.cookies.get(AUTH_COOKIE)?.value);

  if (isLoginPage) {
    if (!authenticated) return NextResponse.next();
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (!authenticated) {
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
};
