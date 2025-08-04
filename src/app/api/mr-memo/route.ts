import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// MR 메모 저장
export async function POST(req: NextRequest) {
  try {
    const { songId, memo } = await req.json()

    if (!songId || !memo) {
      return NextResponse.json({ error: '곡 ID와 메모가 필요합니다.' }, { status: 400 })
    }

    // 기존 메모가 있으면 업데이트, 없으면 생성
    const result = await prisma.mRMemo.upsert({
      where: { songId },
      update: { memo },
      create: { songId, memo }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('메모 저장 오류:', error)
    return NextResponse.json({ error: '메모 저장에 실패했습니다.' }, { status: 500 })
  }
}

// MR 메모 불러오기
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const songId = searchParams.get('songId')

    if (!songId) {
      return NextResponse.json({ error: '곡 ID가 필요합니다.' }, { status: 400 })
    }

    const memo = await prisma.mRMemo.findUnique({
      where: { songId }
    })

    return NextResponse.json({ success: true, data: memo })
  } catch (error) {
    console.error('메모 불러오기 오류:', error)
    return NextResponse.json({ error: '메모 불러오기에 실패했습니다.' }, { status: 500 })
  }
} 