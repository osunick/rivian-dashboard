import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const auth = req.cookies.get('rivian_auth')?.value;
  const { pathname } = req.nextUrl;

  // Allow login page and API through
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login')) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (auth !== 'true') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
