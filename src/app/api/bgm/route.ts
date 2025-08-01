// BGM API 라우트
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// YouTube URL에서 비디오 ID 추출
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

// 하이픈 장르를 언더스코어로 변환 (Prisma enum과 호환)
function convertGenreToPrisma(genre: string): string {
  return genre.replace('-', '_')
}

// 언더스코어 장르를 하이픈으로 변환 (클라이언트 타입과 호환)
function convertGenreToClient(genre: string): string {
  return genre.replace('_', '-')
}

// Prisma enum을 클라이언트 타입으로 변환
function convertPrismaGenreToClient(genre: any): string {
  const genreString = String(genre)
  return genreString.replace('_', '-')
}

// YouTube API에서 비디오 정보 가져오기 (API 키가 있을 때만)
async function getYouTubeVideoInfo(videoId: string): Promise<{ title: string; duration: number; embeddable: boolean } | null> {
  const apiKey = process.env.YOUTUBE_API_KEY
  
  if (!apiKey) {
    console.warn('YouTube API key not found, skipping video info fetch')
    return null
  }

  try {
    console.log('Fetching YouTube video info for:', videoId)
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails,status&key=${apiKey}`
    )
    
    if (!response.ok) {
      console.warn('YouTube API request failed:', response.status, response.statusText)
      return null
    }

    const data = await response.json()
    console.log('YouTube API response:', data)
    
    if (data.items && data.items.length > 0) {
      const video = data.items[0]
      const duration = parseYouTubeDuration(video.contentDetails.duration)
      const embeddable = video.status?.embeddable ?? true
      
      return {
        title: video.snippet.title,
        duration: duration,
        embeddable: embeddable
      }
    }
    
    return null
  } catch (error) {
    console.error('Error fetching YouTube video info:', error)
    return null
  }
}

// YouTube duration 형식을 초 단위로 변환
function parseYouTubeDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return 0

  const hours = parseInt(match[1]?.replace('H', '') || '0')
  const minutes = parseInt(match[2]?.replace('M', '') || '0')
  const seconds = parseInt(match[3]?.replace('S', '') || '0')

  return hours * 3600 + minutes * 60 + seconds
}

export async function GET() {
  try {
    const bgmTracks = await prisma.bgmTrack.findMany({
      orderBy: [
        { genre: 'asc' },
        { order: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // 장르별로 그룹화 (클라이언트 타입으로 변환)
    const library: { [genre: string]: any[] } = {}
    bgmTracks.forEach((track) => {
      const clientGenre = convertPrismaGenreToClient(track.genre)
      if (!library[clientGenre]) {
        library[clientGenre] = []
      }
      library[clientGenre].push({
        ...track,
        genre: clientGenre
      })
    })

    return NextResponse.json(library)
  } catch (error) {
    console.error('Error fetching BGM library:', error)
    return NextResponse.json({ error: 'Failed to fetch BGM library' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('BGM POST request received')
    
    const cookie = request.cookies.get('admin_session')
    const isAdmin = cookie && cookie.value === '1'
    
    console.log('Admin session check:', { cookie: cookie?.value, isAdmin })
    
    if (!isAdmin) {
      console.log('Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body:', body)
    
    const { videoUrl, genre, title, tags } = body

    if (!videoUrl || !genre) {
      console.log('Missing required fields:', { videoUrl, genre })
      return NextResponse.json({ error: 'videoUrl and genre are required' }, { status: 400 })
    }

    const videoId = extractVideoId(videoUrl)
    console.log('Extracted video ID:', videoId)
    
    if (!videoId) {
      console.log('Invalid YouTube URL:', videoUrl)
      return NextResponse.json({ error: 'Invalid YouTube URL' }, { status: 400 })
    }

    // 제목이 없으면 YouTube에서 가져오기 시도
    let finalTitle = title
    let duration: number | null = null
    let isEmbeddable = true

    if (!finalTitle || finalTitle.trim() === '') {
      console.log('No title provided, fetching from YouTube')
      const videoInfo = await getYouTubeVideoInfo(videoId)
      if (videoInfo) {
        finalTitle = videoInfo.title
        duration = videoInfo.duration
        isEmbeddable = videoInfo.embeddable
        console.log('YouTube video info fetched:', videoInfo)
      } else {
        // API 키가 없거나 실패한 경우 기본 제목 사용
        finalTitle = `YouTube Video (${videoId})`
        console.log('Using fallback title:', finalTitle)
      }
    } else {
      // 제목이 제공된 경우에도 임베드 가능성 확인
      const videoInfo = await getYouTubeVideoInfo(videoId)
      if (videoInfo) {
        isEmbeddable = videoInfo.embeddable
        duration = videoInfo.duration
      }
    }

    // 임베드 불가능한 비디오인 경우 경고
    if (!isEmbeddable) {
      console.log('Video is not embeddable:', videoId)
      return NextResponse.json({ 
        error: '이 비디오는 임베드 재생이 허용되지 않습니다. 다른 비디오를 선택해주세요.',
        details: 'Video embedding is not allowed'
      }, { status: 400 })
    }

    // 장르를 Prisma 형식으로 변환
    const prismaGenre = convertGenreToPrisma(genre)
    console.log('Creating BGM track with data:', {
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      genre: prismaGenre,
      title: finalTitle,
      duration,
      tags: tags || []
    })

    const bgmTrack = await prisma.bgmTrack.create({
      data: {
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        genre: prismaGenre as any,
        title: finalTitle || null,
        duration: duration,
        tags: tags || [],
      },
    })

    // 클라이언트 타입으로 변환하여 반환
    const clientTrack = {
      ...bgmTrack,
      genre: convertPrismaGenreToClient(bgmTrack.genre)
    }

    console.log('BGM track created successfully:', clientTrack)
    return NextResponse.json(clientTrack)
  } catch (error) {
    console.error('Error adding BGM track:', error)
    return NextResponse.json({ 
      error: 'Failed to add BGM track',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 