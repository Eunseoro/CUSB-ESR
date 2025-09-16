// 협업 메모 댓글 API: 댓글 추가, 조회
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 댓글 추가
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { content } = await req.json()
    
    if (!content) {
      return NextResponse.json({ error: '댓글 내용은 필수입니다.' }, { status: 400 })
    }
    
    const comment = await prisma.collaborationMemoComment.create({
      data: {
        memoId: id,
        content
      }
    })
    
    return NextResponse.json(comment)
  } catch (error) {
    console.error('댓글 추가 오류:', error)
    return NextResponse.json({ error: '댓글 추가에 실패했습니다.' }, { status: 500 })
  }
}
