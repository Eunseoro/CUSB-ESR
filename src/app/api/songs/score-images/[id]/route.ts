// 개별 악보 이미지 삭제 API
import { NextRequest, NextResponse } from 'next/server'
import { ensureConnection } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { del as blobDel } from '@vercel/blob'

export const runtime = 'nodejs'
export const maxDuration = 300

// 악보 이미지 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get('admin_session')
    const isAdmin = cookie && (cookie.value === '1' || cookie.value === 'admin')

    if (!isAdmin) {
      return NextResponse.json({ error: '관리자만 삭제할 수 있습니다.' }, { status: 403 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: '이미지 ID가 필요합니다.' }, { status: 400 })
    }

    const prisma = await ensureConnection()

    // 이미지 정보 조회
    const scoreImage = await prisma.scoreImage.findUnique({
      where: { id }
    })

    if (!scoreImage) {
      return NextResponse.json({ error: '이미지를 찾을 수 없습니다.' }, { status: 404 })
    }

    // Blob storage에서 파일 삭제
    try {
      const url = scoreImage.imageUrl
      // URL에서 파일 경로 추출 (scores/노래ID/파일명.webp 형식)
      const urlObj = new URL(url)
      const pathname = urlObj.pathname
      // /blob/ 이후의 경로를 추출
      const pathParts = pathname.split('/blob/')
      if (pathParts.length > 1) {
        const filePath = pathParts[1]
        await blobDel(filePath)
        console.log('악보 이미지 Blob 삭제 성공:', filePath)
      } else {
        console.warn('Blob URL 형식이 올바르지 않습니다:', url)
      }
    } catch (error) {
      console.error('악보 이미지 Blob 삭제 실패:', error)
    }

    // 데이터베이스에서 삭제
    await prisma.scoreImage.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('악보 이미지 삭제 실패:', error)
    return NextResponse.json({ 
      error: '이미지 삭제에 실패했습니다.' 
    }, { status: 500 })
  }
}