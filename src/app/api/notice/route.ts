// 이 파일은 공지사항(Notice) API 라우트입니다.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


export async function GET() {
  try {
    // 공지사항 조회
    let notice = await prisma.notice.findUnique({ where: { id: 1 } })
    if (!notice) {
      notice = await prisma.notice.create({ data: { id: 1, content: '', isVisible: true } })
    }
    return NextResponse.json(notice)
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.$disconnect();
    }
  }
}

export async function PUT(req: NextRequest) {
  // 공지사항 내용 수정 (관리자만)
  const cookie = req.cookies.get('admin_session');
  const isAdmin = cookie && cookie.value === '1';
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { content } = await req.json();
  const notice = await prisma.notice.update({ where: { id: 1 }, data: { content } });
  return NextResponse.json(notice);
}

export async function PATCH(req: NextRequest) {
  // 공지사항 ON/OFF 토글 (관리자만)
  const cookie = req.cookies.get('admin_session');
  const isAdmin = cookie && cookie.value === '1';
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { isVisible } = await req.json();
  const notice = await prisma.notice.update({ where: { id: 1 }, data: { isVisible } });
  return NextResponse.json(notice);
} 