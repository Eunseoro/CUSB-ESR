// 이 파일은 관리자 인증 상태를 반환하는 API입니다.
import { NextRequest, NextResponse } from 'next/server';
import { AdminRole } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('admin_session');
  const role = cookie?.value || AdminRole.GUEST;
  
  return NextResponse.json({ 
    isAdmin: role === AdminRole.ADMIN,
    role: role,
    isStaff: role === AdminRole.STAFF,
    isVisitor: role === AdminRole.VISITOR,
    isGuest: role === AdminRole.GUEST
  });
} 