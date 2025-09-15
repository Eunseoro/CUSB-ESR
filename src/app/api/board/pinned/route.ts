import { NextRequest, NextResponse } from 'next/server'
import { ensureConnection } from '@/lib/prisma'

// GET: 현재 고정 Guestbook id 목록 반환
export async function GET() {
  try {
    const prisma = await ensureConnection()
    const pinned = await prisma.pinnedGuestbook.findMany({ orderBy: { updatedAt: 'asc' } });
    return NextResponse.json({ guestbookIds: pinned.map(p => p.guestbookId) });
  } catch (error) {
    console.error('Pinned API 에러:', error)
    return NextResponse.json({ guestbookIds: [] });
  }
}

// POST: 고정 Guestbook id 목록 설정 (관리자만, 전체 갱신)
export async function POST(req: NextRequest) {
  try {
    const prisma = await ensureConnection()
    
    const { guestbookIds } = await req.json(); // 배열로 받음
    const cookie = req.cookies.get('admin_session');
    const isAdmin = cookie && cookie.value === 'admin';
    if (!isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 });
    if (!Array.isArray(guestbookIds)) return NextResponse.json({ error: 'guestbookIds 배열 필수' }, { status: 400 });
    // 기존 전체 삭제 후 새로 추가
    await prisma.pinnedGuestbook.deleteMany({});
    if (guestbookIds.length > 0) {
      await prisma.pinnedGuestbook.createMany({ data: guestbookIds.map(id => ({ guestbookId: id })) });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Pinned POST API 에러:', error)
    return NextResponse.json({ error: '고정 게시물 설정에 실패했습니다.' }, { status: 500 });
  }
} 