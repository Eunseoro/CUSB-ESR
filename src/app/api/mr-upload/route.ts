import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase 관리자 클라이언트가 초기화되지 않았습니다.')
      return NextResponse.json({ 
        error: 'Supabase 서비스가 초기화되지 않았습니다. 환경변수를 확인해주세요.' 
      }, { status: 500 })
    }
    
    // 환경변수 검증
    const supabaseUrl = process.env.SUPA__SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPA__SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase 환경변수 누락:', { 
        url: !!supabaseUrl, 
        serviceKey: !!supabaseServiceKey 
      })
      return NextResponse.json({ 
        error: 'Supabase 환경변수가 설정되지 않았습니다.' 
      }, { status: 500 })
    }

    // 관리자 인증 확인
    const cookie = req.cookies.get('admin_session')
    const isAdmin = cookie && cookie.value === 'admin'
    
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const songId = formData.get('songId') as string

    console.log('FormData 파싱:', { 
      hasFile: !!file, 
      hasSongId: !!songId,
      songId,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    })

    if (!file || !songId) {
      return NextResponse.json({ error: '파일과 곡 ID가 필요합니다.' }, { status: 400 })
    }

    // 파일 크기 검증 (50MB)
    if (file.size > 52428800) {
      return NextResponse.json({ error: '파일 크기가 50MB를 초과합니다.' }, { status: 400 })
    }

    // 파일 타입 검증
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json({ error: '오디오 파일만 업로드 가능합니다.' }, { status: 400 })
    }

    // 파일 확장자 추출
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp3'
    
    console.log('MR 파일 업로드 시작:', { songId, fileExtension, fileSize: file.size })
    
    // Supabase에 업로드 (관리자 클라이언트 사용)
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized')
    }
    
    const { data, error } = await supabaseAdmin.storage
      .from('mr-files')
      .upload(`${songId}.${fileExtension}`, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error('Supabase 업로드 오류:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('MR 파일 업로드 성공:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('MR 업로드 오류:', error)
    console.error('오류 스택:', error instanceof Error ? error.stack : '스택 없음')
    return NextResponse.json({ error: '업로드 중 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // 관리자 인증 확인
    const cookie = req.cookies.get('admin_session')
    const isAdmin = cookie && cookie.value === 'admin'
    
    if (!isAdmin) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 401 })
    }

    const { songId } = await req.json()

    if (!songId) {
      return NextResponse.json({ error: '곡 ID가 필요합니다.' }, { status: 400 })
    }

    // 먼저 어떤 파일이 존재하는지 확인
    const extensions = ['mp3', 'm4a', 'wav', 'ogg']
    let existingFile = null
    
    for (const ext of extensions) {
      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not initialized')
      }
      
      const { data, error } = await supabaseAdmin.storage
        .from('mr-files')
        .list('', {
          search: `${songId}.${ext}`
        })
      
      if (!error && data && data.length > 0) {
        existingFile = `${songId}.${ext}`
        break
      }
    }

    if (!existingFile) {
      return NextResponse.json({ error: '삭제할 MR 파일을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 실제 파일 삭제
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not initialized')
    }
    
    const { error: deleteError } = await supabaseAdmin.storage
      .from('mr-files')
      .remove([existingFile])

    if (deleteError) {
      console.error('Supabase 삭제 오류:', deleteError)
      return NextResponse.json({ error: '파일 삭제에 실패했습니다.' }, { status: 500 })
    }

    console.log(`MR 파일 삭제 성공: ${existingFile}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('MR 삭제 오류:', error)
    return NextResponse.json({ error: '삭제 중 오류가 발생했습니다.' }, { status: 500 })
  }
} 