import { createClient } from '@supabase/supabase-js'

// 클라이언트 사이드에서는 NEXT_PUBLIC_ 접두사가 붙은 환경변수만 사용 가능
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Supabase 클라이언트를 안전하게 초기화
let supabase: any = null

try {
  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL environment variable is required')
    throw new Error('Supabase URL is not configured')
  }

  if (!supabaseAnonKey) {
    console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required')
    throw new Error('Supabase Anon Key is not configured')
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey)
} catch (error) {
  console.error('Failed to initialize Supabase client:', error)
  // 개발 환경에서만 에러를 throw
  if (process.env.NODE_ENV === 'development') {
    throw error
  }
}

export { supabase } 