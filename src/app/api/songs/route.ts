// 이 파일은 노래 목록 조회 및 노래 추가 API Route를 정의합니다.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageNum = parseInt(searchParams.get('pageNum') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'title'
    const title = searchParams.get('title') // 제목으로만 검색하는 경우
    const skip = (pageNum - 1) * limit

    // 캐시 헤더 설정 (실시간 데이터를 위해 캐시 비활성화)
    const cacheHeaders = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }

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
    
    // 제목으로만 검색하는 경우 (팝업에서 사용)
    if (title) {
      where.title = { contains: title, mode: 'insensitive' }
    }

    let orderBy: { [key: string]: 'asc' | 'desc' }[] = []
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
      case 'likeCount':
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

    // 제목으로만 검색하는 경우 간단한 응답 반환
    if (title) {
      const songs = await prisma.song.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        take: 10,
        select: {
          id: true,
          title: true,
          artist: true,
          videoUrl: true,
          category: true,
          createdAt: true,
          likeCount: true,
          isFirstVerseOnly: true,
          isHighDifficulty: true,
          isLoopStation: true,
          isMr: true
        }
      })
      
      return NextResponse.json(songs, { headers: cacheHeaders })
    }

    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        distinct: ['id'], // 중복 제거
        select: {
          id: true,
          title: true,
          artist: true,
          videoUrl: true,
          videoUrl2: true,
          description: true,
          lyrics: true,
          category: true,
          createdAt: true,
          updatedAt: true,
          likeCount: true,
          isFirstVerseOnly: true,
          isHighDifficulty: true,
          isLoopStation: true,
          isMr: true,
          progress: true,
          isPublic: true
        }
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
        page: pageNum,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, { headers: cacheHeaders })
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
    // 관리자 인증 확인 (쿠키 기반) - ADMIN 등급만 허용
    const cookie = request.cookies.get('admin_session');
    const isAdmin = cookie && cookie.value === 'admin';
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