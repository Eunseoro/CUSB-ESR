// 한국어 주석: 관리자 인증 API (서버에서 환경변수로 인증)
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  
  const authResult = verifyAdminPassword(password);
  
  if (authResult) {
    // 인증 성공 시 등급 정보를 쿠키에 저장
    const res = NextResponse.json({ 
      ok: true, 
      role: authResult.role 
    });
    res.cookies.set('admin_session', authResult.role, { httpOnly: true, path: '/', sameSite: 'lax' });
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