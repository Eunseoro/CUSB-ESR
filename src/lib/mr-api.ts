import { supabase } from './supabase'
import { optimizeAudioFile } from './audio-converter'

// MR 파일 업로드 (서버 사이드 API 사용)
export async function uploadMRFile(songId: string, file: File) {
  try {
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

    // FormData 생성
    const formData = new FormData()
    formData.append('file', optimizedFile)
    formData.append('songId', songId)

    // 서버 사이드 API 호출
    const response = await fetch('/api/mr-upload', {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || '업로드에 실패했습니다.')
    }

    return { success: true, data: result.data }
  } catch (error) {
    console.error('MR 파일 업로드 실패:', error)
    return { success: false, error: error instanceof Error ? error.message : '알 수 없는 오류' }
  }
}

// MR 파일 삭제 (서버 사이드 API 사용)
export async function deleteMRFile(songId: string) {
  try {
    console.log('MR 파일 삭제 요청:', songId)
    
    const response = await fetch('/api/mr-upload', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ songId })
    })

    const result = await response.json()
    console.log('삭제 응답:', result)

    if (!response.ok) {
      throw new Error(result.error || '삭제에 실패했습니다.')
    }

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