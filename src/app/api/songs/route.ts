// 이 파일은 노래 목록 조회 및 노래 추가 API Route를 정의합니다.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const sort = searchParams.get('sort') || 'latest'
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      isPublic: true,
    }

    // 검색어가 있을 때만 필터링 적용
    // 카테고리 필터링은 클라이언트 사이드에서 정확하게 처리
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { artist: { contains: search, mode: 'insensitive' } },
      ]
    }

    let orderBy: any[] = []
    switch (sort) {
      case 'latest':
        orderBy = [{ createdAt: 'desc' }]
        break
      case 'oldest':
        orderBy = [{ createdAt: 'asc' }]
        break
      case 'popular':
        orderBy = [{ likeCount: 'desc' }, { createdAt: 'desc' }]
        break
      case 'title':
        orderBy = [{ title: 'asc' }, { artist: 'asc' }]
        break
      case 'artist':
        orderBy = [{ artist: 'asc' }, { title: 'asc' }]
        break
      case 'first-verse':
        // 1절만 곡을 우선적으로 정렬 (서버에서 기본 정렬만, 클라이언트에서 세부 정렬)
        orderBy = [{ isFirstVerseOnly: 'desc' }, { artist: 'asc' }]
        break
      case 'high-difficulty':
        // 고난이도 곡을 우선적으로 정렬
        orderBy = [{ isHighDifficulty: 'desc' }, { artist: 'asc' }]
        break
      case 'loop-station':
        // 루프 스테이션 곡을 우선적으로 정렬
        orderBy = [{ isLoopStation: 'desc' }, { artist: 'asc' }]
        break
      case 'mr':
        // MR 곡을 우선적으로 정렬
        orderBy = [{ isMr: 'desc' }, { artist: 'asc' }]
        break
      default:
        orderBy = [{ createdAt: 'desc' }]
    }

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        distinct: ['id'], // 중복 제거
      }),
      prisma.song.count({ where }),
    ])

    // 카테고리 문자열을 배열로 변환
    const songsWithCategories = songs.map(song => ({
      ...song,
      categories: song.category ? song.category.split(',').map(cat => cat.trim()) : []
    }))

    return NextResponse.json({
      songs: songsWithCategories,
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
    const { title, artist, categories, videoUrl, videoUrl2, description, lyrics, isFirstVerseOnly, isHighDifficulty, isLoopStation, isMr } = body

    // 입력 검증
    if (!title || !artist || !categories || categories.length === 0) {
      return NextResponse.json(
        { error: '제목, 아티스트, 카테고리를 선택해 주세요.' },
        { status: 400 }
      )
    }

    // categories 배열을 쉼표로 구분된 문자열로 변환
    const categoryString = categories.join(',')

    const song = await prisma.song.create({
      data: {
        title,
        artist,
        category: categoryString,
        videoUrl,
        videoUrl2,
        description,
        lyrics,
        isFirstVerseOnly: isFirstVerseOnly || false,
        isHighDifficulty: isHighDifficulty || false,
        isLoopStation: isLoopStation || false,
        isMr: isMr || false,
      },
    })

    // 응답에서 카테고리를 배열로 변환
    const songWithCategories = {
      ...song,
      categories: song.category ? song.category.split(',').map(cat => cat.trim()) : []
    }

    return NextResponse.json(songWithCategories, { status: 201 })
  } catch (error) {
    console.error('Error creating song:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}