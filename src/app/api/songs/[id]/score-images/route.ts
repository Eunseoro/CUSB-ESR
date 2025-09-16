// 특정 노래의 악보 이미지 목록 조회 API
import { NextRequest, NextResponse } from 'next/server'
import { ensureConnection } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 300

// 악보 이미지 목록 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: songId } = await params

    if (!songId) {
      return NextResponse.json({ error: '노래 ID가 필요합니다.' }, { status: 400 })
    }

    const prisma = await ensureConnection()

    // 노래 존재 확인
    const song = await prisma.song.findUnique({ where: { id: songId } })
    if (!song) {
      return NextResponse.json({ error: '노래를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 악보 이미지 목록 조회
    const images = await prisma.scoreImage.findMany({
      where: { songId },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ images })

  } catch (error) {
    console.error('악보 이미지 조회 실패:', error)
    return NextResponse.json({ 
      error: '이미지 조회에 실패했습니다.' 
    }, { status: 500 })
  }
}
