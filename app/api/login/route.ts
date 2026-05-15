import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password === process.env.DASHBOARD_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('rivian_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return res;
  }

  return NextResponse.json({ ok: false, error: 'Wrong password' }, { status: 401 });
}
