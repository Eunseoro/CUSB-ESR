import { createClient } from '@supabase/supabase-js'

// Vercel 배포 환경에서는 SUPA__ 접두사가 붙은 환경변수 사용
const supabaseUrl = process.env.SUPA__SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPA__SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

// 환경변수 검증
if (!supabaseUrl) {
  throw new Error('SUPA__SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable is required')
}

if (!supabaseServiceKey) {
  throw new Error('SUPA__SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY environment variable is required')
}

// 서버 사이드에서 사용할 관리자 클라이언트 (서비스 롤 키 사용)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
}) 