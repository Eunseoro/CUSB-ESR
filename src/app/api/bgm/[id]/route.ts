// BGM 개별 항목 API 라우트
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { BgmGenre } from '@prisma/client'

// 하이픈 장르를 언더스코어로 변환 (Prisma enum과 호환)
function convertGenreToPrisma(genre: string): string {
  // 특별한 변환 규칙
  if (genre === '탑골가요') {
    return 'TOPGOL'
  }
  
  return genre.replace('-', '_')
}

// 언더스코어 장르를 하이픈으로 변환 (클라이언트 타입과 호환)
function convertGenreToClient(genre: string): string {
  // 특별한 변환 규칙
  if (genre === 'TOPGOL') {
    return '탑골가요'
  }
  
  return genre.replace('_', '-')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('BGM PUT request received for ID:', id)
    
    const cookie = request.cookies.get('admin_session')
    const isAdmin = cookie && cookie.value === 'admin'
    
    console.log('Admin session check:', { cookie: cookie?.value, isAdmin })
    
    if (!isAdmin) {
      console.log('Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body:', body)
    
    const { title, genre, tags } = body

    if (!title && !genre && !tags) {
      console.log('No fields to update')
      return NextResponse.json({ error: 'At least one field is required' }, { status: 400 })
    }

    const updateData: {
      title?: string;
      genre?: BgmGenre;
      tags?: string[];
    } = {}
    
    if (title !== undefined) {
      updateData.title = title
    }
    
    if (genre !== undefined) {
      updateData.genre = convertGenreToPrisma(genre) as BgmGenre
    }

    if (tags !== undefined) {
      updateData.tags = tags
    }

    console.log('Updating BGM track with data:', updateData)

    const bgmTrack = await prisma.bgmTrack.update({
      where: { id },
      data: updateData,
    })

    // 클라이언트 타입으로 변환하여 반환
    const clientTrack = {
      ...bgmTrack,
      genre: convertGenreToClient(bgmTrack.genre)
    }

    console.log('BGM track updated successfully:', clientTrack)
    return NextResponse.json(clientTrack)
  } catch (error) {
    console.error('Error updating BGM track:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    })
    return NextResponse.json({ 
      error: 'Failed to update BGM track',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('BGM DELETE request received for ID:', id)
    
    const cookie = request.cookies.get('admin_session')
    const isAdmin = cookie && cookie.value === 'admin'
    
    console.log('Admin session check:', { cookie: cookie?.value, isAdmin })
    
    if (!isAdmin) {
      console.log('Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.bgmTrack.delete({
      where: { id },
    })

    console.log('BGM track deleted successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting BGM track:', error)
    return NextResponse.json({ 
      error: 'Failed to delete BGM track',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 