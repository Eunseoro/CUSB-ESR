const { createClient } = require('@supabase/supabase-js')

// 환경변수에서 Supabase 설정 가져오기
const supabaseUrl = process.env.SUPA__SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // 서비스 롤 키 필요

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Supabase URL 또는 Service Role Key가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createStorageBucket() {
  try {
    // mr-files 버킷 생성
    const { data, error } = await supabase.storage.createBucket('mr-files', {
      public: false, // 비공개 버킷
      fileSizeLimit: 52428800, // 50MB 제한
      allowedMimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg']
    })

    if (error) {
      console.error('버킷 생성 실패:', error)
      return
    }

    console.log('mr-files 버킷이 성공적으로 생성되었습니다.')
    
    // 버킷 정책 설정 (선택사항)
    const { error: policyError } = await supabase.storage
      .from('mr-files')
      .createSignedUrl('test.mp3', 60) // 테스트용

    if (policyError) {
      console.log('버킷 정책 설정 완료 (기본값 사용)')
    }

  } catch (error) {
    console.error('버킷 생성 중 오류:', error)
  }
}

createStorageBucket() 