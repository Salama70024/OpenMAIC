import { NextRequest, NextResponse } from 'next/server';
import { SCHOOL_COOKIE, verifySchoolSession } from './lib/school/access';

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === '/api/school/auth') return NextResponse.next();
  if (verifySchoolSession(request.cookies.get(SCHOOL_COOKIE)?.value)) return NextResponse.next();
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'انتهت صلاحية جلسة المعلم. يرجى إدخال رمز الدخول مجدداً.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/', '/school/:path*', '/api/school/:path*'],
};
