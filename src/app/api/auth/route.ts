// 이 파일은 관리자 인증 상태를 반환하는 API입니다.
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('admin_session');
  const isAdmin = cookie && cookie.value === '1';
  return NextResponse.json({ isAdmin });
} 