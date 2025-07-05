// 이 파일은 개별 노래 조회, 수정, 삭제 API Route를 정의합니다.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Category, Prisma } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 노래 정보 조회
    const song = await prisma.song.findUnique({
      where: { id },
    })

    if (!song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(song)
  } catch (error) {
    console.error('Error fetching song:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 관리자 인증 확인 (쿠키 기반)
    const cookie = request.cookies.get('admin_session')
    const isAdmin = cookie && cookie.value === '1'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const song = await prisma.song.findUnique({
      where: { id },
    })

    if (!song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { title, artist, category, videoUrl, videoUrl2, description, lyrics, isFirstVerseOnly, isHighDifficulty, isLoopStation, progress } = body

    const updateData: Prisma.SongUpdateInput = {}
    if (title !== undefined) updateData.title = title
    if (artist !== undefined) updateData.artist = artist
    if (category !== undefined) updateData.category = category as Category
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl
    if (videoUrl2 !== undefined) updateData.videoUrl2 = videoUrl2
    if (description !== undefined) updateData.description = description
    if (lyrics !== undefined) updateData.lyrics = lyrics
    if (isFirstVerseOnly !== undefined) updateData.isFirstVerseOnly = isFirstVerseOnly
    if (isHighDifficulty !== undefined) updateData.isHighDifficulty = isHighDifficulty
    if (isLoopStation !== undefined) updateData.isLoopStation = isLoopStation
    if (progress !== undefined) updateData.progress = progress

    const updatedSong = await prisma.song.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updatedSong)
  } catch (error) {
    console.error('Error updating song:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // 관리자 인증 확인 (쿠키 기반)
    const cookie = request.cookies.get('admin_session')
    const isAdmin = cookie && cookie.value === '1'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const song = await prisma.song.findUnique({
      where: { id },
    })

    if (!song) {
      return NextResponse.json(
        { error: 'Song not found' },
        { status: 404 }
      )
    }

    await prisma.song.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Song deleted successfully' })
  } catch (error) {
    console.error('Error deleting song:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 