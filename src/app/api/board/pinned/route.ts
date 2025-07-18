import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 현재 고정 Guestbook id 목록 반환
export async function GET() {
  try {
    const pinned = await prisma.pinnedGuestbook.findMany({ orderBy: { updatedAt: 'asc' } });
    return NextResponse.json({ guestbookIds: pinned.map(p => p.guestbookId) });
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.$disconnect();
    }
  }
}

// POST: 고정 Guestbook id 목록 설정 (관리자만, 전체 갱신)
export async function POST(req: NextRequest) {
  try {
    const { guestbookIds } = await req.json(); // 배열로 받음
    const cookie = req.cookies.get('admin_session');
    const isAdmin = cookie && cookie.value === '1';
    if (!isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });
    if (!Array.isArray(guestbookIds)) return NextResponse.json({ error: 'guestbookIds 배열 필수' }, { status: 400 });
    // 기존 전체 삭제 후 새로 추가
    await prisma.pinnedGuestbook.deleteMany({});
    if (guestbookIds.length > 0) {
      await prisma.pinnedGuestbook.createMany({ data: guestbookIds.map(id => ({ guestbookId: id })) });
    }
    return NextResponse.json({ ok: true });
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.$disconnect();
    }
  }
} 