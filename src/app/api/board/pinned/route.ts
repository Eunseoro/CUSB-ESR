import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 현재 고정 Guestbook id 반환
export async function GET() {
  const pinned = await prisma.pinnedGuestbook.findUnique({ where: { id: 1 } })
  return NextResponse.json({ guestbookId: pinned?.guestbookId || null })
}

// POST: 고정 Guestbook id 설정 (관리자만)
export async function POST(req: NextRequest) {
  const { guestbookId } = await req.json()
  // 간단한 관리자 인증 (쿠키 기반)
  const cookie = req.cookies.get('admin_session')
  const isAdmin = cookie && cookie.value === '1'
  if (!isAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  if (!guestbookId) return NextResponse.json({ error: 'guestbookId 필수' }, { status: 400 })
  await prisma.pinnedGuestbook.upsert({
    where: { id: 1 },
    update: { guestbookId },
    create: { id: 1, guestbookId },
  })
  return NextResponse.json({ ok: true })
} 