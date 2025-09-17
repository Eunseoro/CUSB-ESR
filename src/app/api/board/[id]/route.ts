// 이 파일은 방명록(Guestbook) 개별 댓글 API 라우트입니다.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 });
    const entry = await prisma.guestbook.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(entry);
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.$disconnect();
    }
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 });
    const cookie = req.cookies.get('admin_session');
    const isAdmin = cookie && cookie.value === 'admin';
    const { userKey } = await req.json();
    const entry = await prisma.guestbook.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!isAdmin && entry.userKey !== userKey) return NextResponse.json({ error: '권한 없음' }, { status: 403 });
    
    // 트랜잭션으로 게시물과 pinned 상태를 함께 삭제
    await prisma.$transaction(async (tx) => {
      // PinnedGuestbook에서 해당 게시물 제거
      await tx.pinnedGuestbook.deleteMany({
        where: { guestbookId: id }
      });
      
      // 게시물 삭제
      await tx.guestbook.delete({ where: { id } });
    });
    
    return NextResponse.json({ ok: true });
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.$disconnect();
    }
  }
} 