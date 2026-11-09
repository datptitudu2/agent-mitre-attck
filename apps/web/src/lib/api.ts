import { supabase } from '@/lib/supabase'

const rawApiBase = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/$/, '')

export function buildApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${rawApiBase}${normalized}`
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (supabase) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
  })

  if (!response.ok) {
    let message = `Lỗi máy chủ (${response.status})`
    try {
      const errJson = await response.json()
      message = errJson?.error?.message ?? errJson?.detail ?? message
    } catch {
      // Bỏ qua nếu response không phải JSON
    }
    throw new Error(message)
  }

  return (await response.json()) as T
}
