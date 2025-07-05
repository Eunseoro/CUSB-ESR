// 이 파일은 노래 목록 조회 및 노래 추가 API Route를 정의합니다.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Category } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as Category | null
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      isPublic: true,
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        orderBy: [
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.song.count({ where }),
    ])

    return NextResponse.json({
      songs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching songs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // 관리자 인증 확인 (쿠키 기반)
    const cookie = request.cookies.get('admin_session');
    const isAdmin = cookie && cookie.value === '1';
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json()
    const { title, artist, category, videoUrl, videoUrl2, description, lyrics, isFirstVerseOnly, isHighDifficulty, isLoopStation } = body

    // 입력 검증
    if (!title || !artist || !category) {
      return NextResponse.json(
        { error: 'Title, artist, and category are required' },
        { status: 400 }
      )
    }

    // category 값이 Enum 값인지 검증
    if (!Object.values(Category).includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${Object.values(Category).join(', ')}` },
        { status: 400 }
      )
    }

    const song = await prisma.song.create({
      data: {
        title,
        artist,
        category: category as Category,
        videoUrl,
        videoUrl2,
        description,
        lyrics,
        isFirstVerseOnly: isFirstVerseOnly || false,
        isHighDifficulty: isHighDifficulty || false,
        isLoopStation: isLoopStation || false,
      },
    })

    return NextResponse.json(song, { status: 201 })
  } catch (error) {
    console.error('Error creating song:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 