import { NextRequest, NextResponse } from 'next/server';
import { checkSchoolCode, createSchoolSession, SCHOOL_COOKIE } from '@/lib/school/access';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  let code: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 200) throw new Error('Too large');
    const body: unknown = JSON.parse(raw);
    code = body && typeof body === 'object' ? (body as { code?: unknown }).code : undefined;
  } catch {
    return NextResponse.json({ error: 'رمز الدخول غير صالح.' }, { status: 400 });
  }
  if (!checkSchoolCode(code)) {
    return NextResponse.json({ error: 'رمز الدخول غير صحيح.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const session = createSchoolSession();
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SCHOOL_COOKIE, session.value, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: session.maxAge,
  });
  return response;
}
