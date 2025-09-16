// 이 파일은 방명록(Guestbook) API 라우트입니다.
import { NextRequest, NextResponse } from 'next/server'
import { ensureConnection } from '@/lib/prisma'

// Next.js 15에서 bodyParser 설정
export const runtime = 'nodejs';
export const maxDuration = 300; // 5분 타임아웃

export async function GET(request: NextRequest) {
  try {
    const prisma = await ensureConnection()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit
    
    // songs API와 동일한 패턴으로 수정
    const list = await prisma.guestbook.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    })
    
    return NextResponse.json(list)
  } catch (error) {
    console.error('Board API 에러:', error)
    
    // Prisma 연결 에러인 경우 특별 처리
    if (error instanceof Error && error.message.includes('Engine is not yet connected')) {
      console.error('Prisma 엔진 연결 실패 - 재시도 필요')
      return NextResponse.json({ 
        error: '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' 
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: '게시물을 불러오는데 실패했습니다.' 
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const prisma = await ensureConnection()
    
    // 방명록 등록
    const { author, content, userKey } = await req.json()
    if (!author || !content || !userKey) {
      return NextResponse.json({ error: '작성자, 내용, userKey는 필수입니다.' }, { status: 400 })
    }
    const entry = await prisma.guestbook.create({ data: { author, content, userKey } })
    return NextResponse.json(entry)
  } catch (error) {
    console.error('Board POST API 에러:', error)
    
    // Prisma 연결 에러인 경우 특별 처리
    if (error instanceof Error && error.message.includes('Engine is not yet connected')) {
      console.error('Prisma 엔진 연결 실패 - 재시도 필요')
      return NextResponse.json({ 
        error: '데이터베이스 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' 
      }, { status: 503 })
    }
    
    return NextResponse.json({ 
      error: '게시물을 등록하는데 실패했습니다.' 
    }, { status: 500 })
  }
} 