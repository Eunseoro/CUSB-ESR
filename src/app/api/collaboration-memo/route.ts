// 협업 메모 API: 메모 생성, 조회, 수정, 삭제
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 메모 목록 조회
export async function GET() {
  try {
    const memos = await prisma.collaborationMemo.findMany({
      include: {
        comments: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(memos)
              } catch (error) {
                console.error('메모 조회 오류:', error)
                return NextResponse.json({ error: '메모 조회에 실패했습니다.' }, { status: 500 })
              }
}

// 새 메모 생성
export async function POST(req: NextRequest) {
  try {
    const { target, content } = await req.json()
    
    if (!target || !content) {
      return NextResponse.json({ error: '대상과 내용은 필수입니다.' }, { status: 400 })
    }
    
    const memo = await prisma.collaborationMemo.create({
      data: {
        target,
        content,
        status: 'pending',
        color: 'yellow'
      }
    })
    
    return NextResponse.json(memo)
              } catch (error) {
                console.error('메모 생성 오류:', error)
                return NextResponse.json({ error: '메모 생성에 실패했습니다.' }, { status: 500 })
              }
}
