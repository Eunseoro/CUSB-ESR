import { createClient } from '@supabase/supabase-js'

// Vercel 배포 환경에서는 SUPA_ 접두사가 붙은 환경변수 사용
const supabaseUrl = process.env.SUPA__SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.SUPA__SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey) 