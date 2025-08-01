// 이 파일은 노래 좋아요 기능 API Route를 정의합니다.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: songId } = await params
    
    console.log('POST /api/songs/[id]/like - Request received')
    console.log('Song ID:', songId)
    
    // 익명 사용자 ID 가져오기
    const anonymousId = request.headers.get('x-anonymous-id')
    console.log('Anonymous ID from header:', anonymousId)
    
    if (!anonymousId) {
      console.log('No anonymous ID provided')
      return NextResponse.json(
        { error: 'Anonymous ID required' },
        { status: 400 }
      )
    }

    // 노래 존재 확인
    const song = await prisma.song.findUnique({
      where: { id: songId },
    })

    if (!song) {
      console.log('Song not found:', songId)
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      )
    }

    console.log('Song found:', song.title)

    // 기존 좋아요 확인
    const existingLike = await prisma.songLike.findUnique({
      where: {
        userId_songId: {
          userId: anonymousId,
          songId,
        },
      },
    })

    console.log('Existing like:', existingLike)

    if (existingLike) {
      // 좋아요 취소
      await prisma.songLike.delete({
        where: {
          userId_songId: {
            userId: anonymousId,
            songId,
          },
        },
      })

      // 실제 좋아요 개수로 업데이트 (음수 방지)
      const actualLikeCount = await prisma.songLike.count({
        where: { songId },
      })

      const updatedSong = await prisma.song.update({
        where: { id: songId },
        data: {
          likeCount: actualLikeCount,
        },
      })

      console.log('Like removed, actual count:', actualLikeCount)
      return NextResponse.json({ liked: false, likeCount: updatedSong.likeCount })
    } else {
      // 좋아요 추가
      await prisma.songLike.create({
        data: {
          userId: anonymousId,
          songId,
        },
      })

      // 실제 좋아요 개수로 업데이트
      const actualLikeCount = await prisma.songLike.count({
        where: { songId },
      })

      const updatedSong = await prisma.song.update({
        where: { id: songId },
        data: {
          likeCount: actualLikeCount,
        },
      })

      console.log('Like added, actual count:', actualLikeCount)
      return NextResponse.json({ liked: true, likeCount: updatedSong.likeCount })
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: songId } = await params
    
    console.log('GET /api/songs/[id]/like - Request received')
    console.log('Song ID:', songId)
    
    // 익명 사용자 ID 가져오기
    const anonymousId = request.headers.get('x-anonymous-id')
    console.log('Anonymous ID from header:', anonymousId)
    
    if (!anonymousId) {
      console.log('No anonymous ID provided')
      return NextResponse.json(
        { error: 'Anonymous ID required' },
        { status: 400 }
      )
    }

    // 노래 존재 확인
    const song = await prisma.song.findUnique({
      where: { id: songId },
    })

    if (!song) {
      console.log('Song not found:', songId)
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      )
    }

    console.log('Song found:', song.title)

    // 좋아요 상태 확인
    const existingLike = await prisma.songLike.findUnique({
      where: {
        userId_songId: {
          userId: anonymousId,
          songId,
        },
      },
    })

    const liked = !!existingLike
    console.log('Like status:', liked)

    return NextResponse.json({ liked, likeCount: song.likeCount })
  } catch (error) {
    console.error('Error checking like status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 