// 이 파일은 방명록(Guestbook) API 라우트입니다.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit
  const list = await prisma.guestbook.findMany({
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
  })
  return NextResponse.json(list)
}

export async function POST(req: NextRequest) {
  // 방명록 등록 (1000개 초과 시 과거순 자동 삭제)
  const { author, content, userKey } = await req.json()
  if (!author || !content || !userKey) {
    return NextResponse.json({ error: '작성자, 내용, userKey는 필수입니다.' }, { status: 400 })
  }
  // 1000개 초과 시 가장 오래된 글 삭제
  const count = await prisma.guestbook.count()
  if (count >= 1000) {
    const oldest = await prisma.guestbook.findFirst({ orderBy: { createdAt: 'asc' } })
    if (oldest) await prisma.guestbook.delete({ where: { id: oldest.id } })
  }
  const entry = await prisma.guestbook.create({ data: { author, content, userKey } })
  return NextResponse.json(entry)
} 