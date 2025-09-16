// 악보 이미지 업로드 API
import { NextRequest, NextResponse } from 'next/server'
import { ensureConnection } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { convertToWebPForScore } from '@/lib/imageUtils'
import { put } from '@vercel/blob'
import { getKoreanTime } from '@/lib/timezone'

export const runtime = 'nodejs'
export const maxDuration = 300

// 악보 이미지 업로드
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get('admin_session')
    const isAdmin = cookie && (cookie.value === '1' || cookie.value === 'admin')

    if (!isAdmin) {
      return NextResponse.json({ error: '관리자만 업로드할 수 있습니다.' }, { status: 403 })
    }

    const formData = await req.formData()
    const songId = formData.get('songId') as string
    const images = formData.getAll('images') as File[]
    const orders = formData.getAll('orders') as string[]

    if (!songId || images.length === 0) {
      return NextResponse.json({ error: '노래 ID와 이미지는 필수입니다.' }, { status: 400 })
    }

    const prisma = await ensureConnection()

    // 노래 존재 확인
    const song = await prisma.song.findUnique({ where: { id: songId } })
    if (!song) {
      return NextResponse.json({ error: '노래를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 이미지 처리 및 저장
    const uploadedImages = []
    
    for (let i = 0; i < images.length; i++) {
      const file = images[i]
      const order = parseInt(orders[i] || i.toString())

      // 파일 크기 확인 (50MB 제한)
      if (file.size > 50 * 1024 * 1024) {
        return NextResponse.json({ error: '파일 크기는 50MB를 초과할 수 없습니다.' }, { status: 400 })
      }

      // WebP로 변환 (악보 전용 1920x1080 해상도)
      const webpBlob = await convertToWebPForScore(file, 75)
      
      // Blob storage에 업로드
      const uniqueFilename = `scores/${songId}/${getKoreanTime().getTime()}-${i}-${file.name.replace(/\.[^/.]+$/, '')}.webp`
      const blob = await put(uniqueFilename, webpBlob, { access: 'public' })

      // 데이터베이스에 저장
      const scoreImage = await prisma.scoreImage.create({
        data: {
          songId,
          imageUrl: blob.url,
          order
        }
      })

      uploadedImages.push(scoreImage)
    }

    return NextResponse.json({ 
      success: true, 
      images: uploadedImages 
    })

  } catch (error) {
    console.error('악보 업로드 실패:', error)
    return NextResponse.json({ 
      error: '악보 업로드에 실패했습니다.' 
    }, { status: 500 })
  }
}

// 악보 이미지 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const songId = searchParams.get('songId')

    if (!songId) {
      return NextResponse.json({ error: '노래 ID가 필요합니다.' }, { status: 400 })
    }

    const prisma = await ensureConnection()

    const images = await prisma.scoreImage.findMany({
      where: { songId },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json({ images })

  } catch (error) {
    console.error('악보 조회 실패:', error)
    return NextResponse.json({ 
      error: '악보 조회에 실패했습니다.' 
    }, { status: 500 })
  }
}