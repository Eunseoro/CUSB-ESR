import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
  try {
    // 서버 사이드에서 관리자 인증 확인
    const cookie = req.cookies.get('admin_session')
    const isAdmin = cookie && cookie.value === 'admin'
    
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 })
    }

    const { genre, trackIds } = await req.json()

    if (!genre || !Array.isArray(trackIds)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
    }

    // 순서 업데이트 (트랜잭션 없이 개별 업데이트)
    for (let i = 0; i < trackIds.length; i++) {
      try {
        await prisma.bgmTrack.update({
          where: { id: trackIds[i] },
          data: {
            order: i
          }
        })
      } catch (error) {
        console.error(`Failed to update track ${trackIds[i]}:`, error)
        // 개별 실패는 무시하고 계속 진행
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('BGM order update error:', error)
    return NextResponse.json({ error: '순서 변경에 실패했습니다.' }, { status: 500 })
  }
} 