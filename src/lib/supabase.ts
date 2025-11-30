import { createClient } from '@supabase/supabase-js'

// 임시: 환경변수가 읽히지 않을 때 직접 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://gargpfkhcowpxfrdtkwr.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcmdwZmtoY293cHhmcmR0a3dyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0NjQ1ODcsImV4cCI6MjA4MDA0MDU4N30.-B_6q0rnJmpgHZbPhE3oi1KU2pk6Vt7YC-W8vT9XhNc'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhcmdwZmtoY293cHhmcmR0a3dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDQ2NDU4NywiZXhwIjoyMDgwMDQwNTg3fQ.swoRDX-RqRdTCC9hSNCtAjlV-bHDh-PvLRvW0BHz6mY'

console.log('🔍 환경변수 디버그:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '설정됨' : '없음')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '설정됨' : '없음')
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '설정됨' : '없음')

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase 환경 변수가 설정되지 않았습니다.')
  console.log('📋 .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정해주세요.')
}

// 일반 클라이언트 (anon key)
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
)

// 관리자 클라이언트 (service role key) - Storage 접근용
export const supabaseAdmin = supabaseServiceKey ? createClient(
  supabaseUrl || '', 
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
) : null

export default supabase 