// 여러 곡의 좋아요 상태를 한 번에 반환하는 API Route입니다.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({}, { status: 200 })
    }
    const anonymousId = req.headers.get('x-anonymous-id') || ''
    const likes = await prisma.songLike.findMany({
      where: {
        songId: { in: ids },
        userId: anonymousId,
      },
      select: { songId: true },
    })
    const likedStates: { [id: string]: boolean } = {}
    ids.forEach(id => {
      likedStates[id] = likes.some(like => like.songId === id)
    })
    return NextResponse.json(likedStates)
  } catch {
    return NextResponse.json({}, { status: 200 })
  }
} 