import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim()

export const isSupabaseFrontendConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseAnonKey.includes('your-supabase-anon'),
)

// Chỉ khởi tạo client thật khi đã điền VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
export const supabase: SupabaseClient | null = isSupabaseFrontendConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

