import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, authCookieMaxAge, authSecretConfigured, createAuthToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!authSecretConfigured() || !process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Auth is not configured' }, { status: 500 });
  }

  let password = '';
  try {
    const body = await req.json();
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  if (password === process.env.DASHBOARD_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, await createAuthToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: authCookieMaxAge(),
      path: '/',
    });
    return res;
  }

  return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 });
}
