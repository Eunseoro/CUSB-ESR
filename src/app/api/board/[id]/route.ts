// 이 파일은 방명록(Guestbook) 개별 댓글 API 라우트입니다.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ADMIN_HEADER = 'x-admin-auth'

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
    const isAdmin = cookie && cookie.value === '1';
    const { userKey } = await req.json();
    const entry = await prisma.guestbook.findUnique({ where: { id } });
    if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!isAdmin && entry.userKey !== userKey) return NextResponse.json({ error: '권한 없음' }, { status: 403 });
    await prisma.guestbook.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.$disconnect();
    }
  }
} 