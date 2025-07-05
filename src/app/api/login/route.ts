// 한국어 주석: 관리자 인증 API (서버에서 환경변수로 인증)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: '서버 환경변수 미설정' }, { status: 500 });
  }
  if (password === adminPassword) {
    // 인증 성공 시 HttpOnly 쿠키 발급 (Response 쿠키 API 사용)
    const res = NextResponse.json({ ok: true });
    res.cookies.set('admin_session', '1', { httpOnly: true, path: '/', sameSite: 'lax' });
    return res;
  }
  return NextResponse.json({ error: '당신은 유할매가 아닙니다.' }, { status: 401 });
}

export async function DELETE() {
  // 로그아웃: 쿠키 삭제 (Response 쿠키 API 사용)
  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_session', '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
} 