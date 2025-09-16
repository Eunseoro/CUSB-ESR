// 협업 메모 개별 API: 수정, 삭제, 상태 변경
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 메모 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { target, content } = await req.json()
    
    if (!target || !content) {
      return NextResponse.json({ error: '대상과 내용은 필수입니다.' }, { status: 400 })
    }
    
    const memo = await prisma.collaborationMemo.update({
      where: { id },
      data: { target, content }
    })
    
    return NextResponse.json(memo)
  } catch (error) {
    console.error('메모 수정 오류:', error)
    return NextResponse.json({ error: '메모 수정에 실패했습니다.' }, { status: 500 })
  }
}

// 메모 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await prisma.collaborationMemo.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('메모 삭제 오류:', error)
    return NextResponse.json({ error: '메모 삭제에 실패했습니다.' }, { status: 500 })
  }
}

// 메모 상태 변경 (승인/거부)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { status } = await req.json()
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: '유효하지 않은 상태입니다.' }, { status: 400 })
    }
    
    const color = status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'yellow'
    
    const memo = await prisma.collaborationMemo.update({
      where: { id },
      data: { status, color }
    })
    
    return NextResponse.json(memo)
  } catch (error) {
    console.error('메모 상태 변경 오류:', error)
    return NextResponse.json({ error: '메모 상태 변경에 실패했습니다.' }, { status: 500 })
  }
}
