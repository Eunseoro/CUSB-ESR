import { supabase } from './supabase'
import { optimizeAudioFile } from './audio-converter'

// MR 파일 업로드 (서버 사이드 API 사용)
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

    // FormData 생성
    const formData = new FormData()
    formData.append('file', optimizedFile)
    formData.append('songId', songId)

    console.log('MR 파일 업로드 요청:', { songId, fileSize: optimizedFile.size })

    // 서버 사이드 API 호출
    const response = await fetch('/api/mr-upload', {
      method: 'POST',
      body: formData
    })

    console.log('MR 업로드 응답 상태:', response.status, response.statusText)
    console.log('MR 업로드 응답 URL:', response.url)
    console.log('MR 업로드 응답 헤더:', Object.fromEntries(response.headers.entries()))

    // 응답 텍스트 확인
    const responseText = await response.text()
    console.log('MR 업로드 응답 텍스트 (처음 1000자):', responseText.substring(0, 1000))
    console.log('MR 업로드 응답 텍스트 길이:', responseText.length)

    // 응답이 비어있는지 확인
    if (!responseText.trim()) {
      throw new Error('서버에서 빈 응답을 받았습니다.')
    }

    let result
    try {
      result = JSON.parse(responseText)
    } catch (parseError) {
      console.error('JSON 파싱 실패:', parseError)
      console.error('전체 응답 텍스트:', responseText)
      
      // HTML 에러 페이지인지 확인
      if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
        throw new Error('서버에서 HTML 에러 페이지를 반환했습니다. 서버 에러가 발생한 것 같습니다.')
      }
      
      // HTTP 에러 메시지인지 확인
      if (responseText.startsWith('Request') || responseText.includes('Error')) {
        throw new Error(`서버 에러: ${responseText.substring(0, 200)}`)
      }
      
      // Vercel 에러 페이지인지 확인
      if (responseText.includes('Vercel') || responseText.includes('Function')) {
        throw new Error('Vercel 함수 에러가 발생했습니다.')
      }
      
      throw new Error(`서버 응답을 파싱할 수 없습니다: ${responseText.substring(0, 100)}`)
    }

    if (!response.ok) {
      throw new Error(result.error || '업로드에 실패했습니다.')
    }

    console.log('MR 파일 업로드 성공:', result)
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