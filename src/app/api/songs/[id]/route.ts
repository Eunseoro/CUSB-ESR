// 이 파일은 개별 노래 조회, 수정, 삭제 API Route를 정의합니다.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

    // 카테고리 문자열을 배열로 변환
    const songWithCategories = {
      ...song,
      categories: song.category ? song.category.split(',').map(cat => cat.trim()) : []
    }

    return NextResponse.json(songWithCategories)
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
    const isAdmin = cookie && cookie.value === 'admin'
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
    const { title, artist, categories, videoUrl, videoUrl2, description, lyrics, isFirstVerseOnly, isHighDifficulty, isLoopStation, isMr, progress } = body

    const updateData: Prisma.SongUpdateInput = {}
    
    if (title !== undefined) updateData.title = title
    if (artist !== undefined) updateData.artist = artist
    if (categories !== undefined) {
      updateData.category = categories.join(',')
    }
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl
    if (videoUrl2 !== undefined) updateData.videoUrl2 = videoUrl2
    if (description !== undefined) updateData.description = description
    if (lyrics !== undefined) updateData.lyrics = lyrics
    if (isFirstVerseOnly !== undefined) updateData.isFirstVerseOnly = isFirstVerseOnly
    if (isHighDifficulty !== undefined) updateData.isHighDifficulty = isHighDifficulty
    if (isLoopStation !== undefined) updateData.isLoopStation = isLoopStation
    if (isMr !== undefined) updateData.isMr = isMr
    if (progress !== undefined) updateData.progress = progress

    const updatedSong = await prisma.song.update({
      where: { id },
      data: updateData,
    })
    
    // 데이터베이스 트랜잭션 커밋 강제 실행
    await prisma.$executeRaw`COMMIT`
    
    // 업데이트된 데이터를 다시 조회하여 최신 상태 확인
    const freshSong = await prisma.song.findUnique({
      where: { id },
    })

    if (!freshSong) {
      return NextResponse.json(
        { error: 'Song not found after update' },
        { status: 404 }
      )
    }

    // 응답에서 카테고리를 배열로 변환
    const songWithCategories = {
      ...freshSong,
      categories: freshSong.category ? freshSong.category.split(',').map(cat => cat.trim()) : []
    }

    return NextResponse.json(songWithCategories)
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
    const isAdmin = cookie && cookie.value === 'admin'
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