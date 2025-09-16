import { createClient } from '@supabase/supabase-js'

// Vercel 배포 환경에서는 SUPA__ 접두사가 붙은 환경변수 사용
const supabaseUrl = process.env.SUPA__SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPA__SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

// 환경변수 검증 및 안전한 클라이언트 초기화
let supabaseAdmin: ReturnType<typeof createClient> | null = null

if (supabaseUrl && supabaseServiceKey) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    console.log('Supabase 관리자 클라이언트 초기화 성공')
  } catch (error) {
    console.error('Supabase 관리자 클라이언트 초기화 실패:', error)
  }
} else {
  console.error('Supabase 환경변수 누락:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey
  })
}

export { supabaseAdmin } 