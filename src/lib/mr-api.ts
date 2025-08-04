import { supabase } from './supabase'
import { optimizeAudioFile } from './audio-converter'

// MR 파일 업로드 (클라이언트 사이드에서 직접 Supabase 업로드)
export async function uploadMRFile(songId: string, file: File) {
  try {
    console.log('MR 파일 업로드 시작:', { songId, fileName: file.name, fileSize: file.size })
    
    // 파일 크기 검증 (50MB 제한)
    if (file.size > 52428800) {
      throw new Error('파일 크기가 50MB를 초과합니다.')
    }

    // 파일 타입 검증
    if (!file.type.startsWith('audio/')) {
      throw new Error('오디오 파일만 업로드 가능합니다.')
    }

    // AAC로 변환
    const optimizedFile = await optimizeAudioFile(file)
    console.log('오디오 파일 최적화 완료:', { originalSize: file.size, optimizedSize: optimizedFile.size })

    // Supabase 클라이언트가 초기화되지 않은 경우
    if (!supabase) {
      throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.')
    }

    // 파일 확장자 추출
    const fileExtension = optimizedFile.name.split('.').pop()?.toLowerCase() || 'mp3'
    
    console.log('Supabase 직접 업로드 시작:', { songId, fileExtension, fileSize: optimizedFile.size })
    
    // 클라이언트 사이드에서 직접 Supabase에 업로드
    const { data, error } = await supabase.storage
      .from('mr-files')
      .upload(`${songId}.${fileExtension}`, optimizedFile, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error('Supabase 업로드 오류:', error)
      throw new Error(`업로드 실패: ${error.message}`)
    }

    console.log('MR 파일 업로드 성공:', data)
    return { success: true, data }
  } catch (error) {
    console.error('MR 파일 업로드 실패:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}

// MR 메모 저장 (DB 사용)
export async function saveMRMemo(songId: string, memo: string) {
  try {
    console.log('메모 저장:', { songId, memo })
    
    const response = await fetch('/api/mr-memo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ songId, memo })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || '메모 저장에 실패했습니다.')
    }

    console.log('메모 저장 성공')
    return { success: true, data: result.data }
  } catch (error) {
    console.error('메모 저장 실패:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}

// MR 메모 불러오기 (DB 사용)
export async function getMRMemo(songId: string) {
  try {
    console.log('메모 불러오기:', songId)
    
    const response = await fetch(`/api/mr-memo?songId=${songId}`)
    const result = await response.json()

    if (!response.ok) {
      console.error('메모 불러오기 실패:', result.error)
      return null
    }

    console.log('메모 불러오기 성공:', result.data?.memo)
    return result.data?.memo || null
  } catch (error) {
    console.error('메모 불러오기 실패:', error)
    return null
  }
}

// MR 파일 삭제 (클라이언트 사이드에서 직접 Supabase 삭제)
export async function deleteMRFile(songId: string) {
  try {
    console.log('MR 파일 삭제 요청:', songId)
    
    // Supabase 클라이언트가 초기화되지 않은 경우
    if (!supabase) {
      throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.')
    }
    
    // 먼저 어떤 파일이 존재하는지 확인
    const extensions = ['mp3', 'm4a', 'wav', 'ogg']
    let existingFile = null
    
    for (const ext of extensions) {
      const { data, error } = await supabase.storage
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
      throw new Error('삭제할 MR 파일을 찾을 수 없습니다.')
    }

    // 실제 파일 삭제
    const { error: deleteError } = await supabase.storage
      .from('mr-files')
      .remove([existingFile])

    if (deleteError) {
      console.error('Supabase 삭제 오류:', deleteError)
      throw new Error(`파일 삭제에 실패했습니다: ${deleteError.message}`)
    }

    console.log(`MR 파일 삭제 성공: ${existingFile}`)
    return { success: true }
  } catch (error) {
    console.error('MR 파일 삭제 실패:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}

// MR 파일 존재 여부 확인 (클라이언트 사이드)
export async function checkMRFileExists(songId: string) {
  try {
    console.log('MR 파일 존재 확인:', songId)
    
    // Supabase 클라이언트가 초기화되지 않은 경우
    if (!supabase) {
      console.error('Supabase 클라이언트가 초기화되지 않았습니다.')
      return false
    }
    
    // 여러 확장자로 검색
    const extensions = ['mp3', 'm4a', 'wav', 'ogg']
    
    for (const ext of extensions) {
      const { data, error } = await supabase.storage
        .from('mr-files')
        .list('', {
          search: `${songId}.${ext}`
        })

      if (error) {
        console.error('Supabase 파일 확인 오류:', error)
        continue
      }

      if (data && data.length > 0) {
        console.log('MR 파일 발견:', `${songId}.${ext}`)
        return true
      }
    }

    console.log('MR 파일 없음:', songId)
    return false
  } catch (error) {
    console.error('MR 파일 확인 실패:', error)
    return false
  }
}

// MR 파일 다운로드 URL 생성 (클라이언트 사이드)
export async function getMRFileUrl(songId: string) {
  try {
    console.log('MR 파일 URL 생성:', songId)
    
    // Supabase 클라이언트가 초기화되지 않은 경우
    if (!supabase) {
      console.error('Supabase 클라이언트가 초기화되지 않았습니다.')
      return null
    }
    
    // 여러 확장자로 시도
    const extensions = ['mp3', 'm4a', 'wav', 'ogg']
    
    for (const ext of extensions) {
      const { data, error } = await supabase.storage
        .from('mr-files')
        .createSignedUrl(`${songId}.${ext}`, 3600) // 1시간 유효

      if (error) {
        console.log(`URL 생성 실패 (${ext}):`, error)
        continue
      }

      if (data?.signedUrl) {
        console.log('MR 파일 URL 생성 성공:', `${songId}.${ext}`)
        return data.signedUrl
      }
    }

    console.log('MR 파일 URL 생성 실패:', songId)
    return null
  } catch (error) {
    console.error('MR 파일 URL 생성 실패:', error)
    return null
  }
} 