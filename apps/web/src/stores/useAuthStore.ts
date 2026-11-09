import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'
import { apiFetch } from '@/lib/api'
import { isSupabaseFrontendConfigured, supabase } from '@/lib/supabase'

export interface UserProfile {
  id: string
  email: string
  role: 'admin' | 'member'
  display_name: string
}

interface AuthState {
  initialized: boolean
  loading: boolean
  session: Session | null
  profile: UserProfile | null
  error: string | null
  initialize: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  loading: false,
  session: null,
  profile: null,
  error: null,

  clearError: () => set({ error: null }),

  initialize: async () => {
    if (!isSupabaseFrontendConfigured || !supabase) {
      set({ initialized: true, session: null, profile: null })
      return
    }

    const { data } = await supabase.auth.getSession()
    const currentSession = data.session

    if (!currentSession) {
      set({ initialized: true, session: null, profile: null })
    } else {
      try {
        const me = await apiFetch<{ user: UserProfile }>('/api/me')
        set({ initialized: true, session: currentSession, profile: me.user, error: null })
      } catch (err) {
        await supabase.auth.signOut()
        set({
          initialized: true,
          session: null,
          profile: null,
          error:
            err instanceof Error
              ? err.message
              : 'Tài khoản không nằm trong allowlist hoặc phiên đã hết hạn.',
        })
      }
    }

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!nextSession) {
        set({ session: null, profile: null })
        return
      }
      try {
        const me = await apiFetch<{ user: UserProfile }>('/api/me')
        set({ session: nextSession, profile: me.user, error: null })
      } catch (err) {
        await supabase?.auth.signOut()
        set({
          session: null,
          profile: null,
          error:
            err instanceof Error
              ? err.message
              : 'Email này không được cấp quyền trong allowlist.',
        })
      }
    })
  },

  signInWithPassword: async (email: string, password: string) => {
    if (!supabase) {
      set({
        error:
          'Chưa cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env.local.',
      })
      return false
    }

    set({ loading: true, error: null })
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error || !data.session) {
      set({
        loading: false,
        error:
          error?.message === 'Invalid login credentials'
            ? 'Email hoặc mật khẩu không chính xác, hoặc tài khoản chưa được Admin cấp quyền.'
            : (error?.message ?? 'Đăng nhập thất bại.'),
      })
      return false
    }

    try {
      const me = await apiFetch<{ user: UserProfile }>('/api/me')
      set({
        loading: false,
        session: data.session,
        profile: me.user,
        error: null,
      })
      return true
    } catch (err) {
      await supabase.auth.signOut()
      set({
        loading: false,
        session: null,
        profile: null,
        error:
          err instanceof Error
            ? err.message
            : 'Tài khoản không nằm trong danh sách cho phép (allowlist).',
      })
      return false
    }
  },

  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    set({ session: null, profile: null, error: null })
  },
}))
