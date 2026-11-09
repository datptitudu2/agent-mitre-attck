import { create } from 'zustand'

type ThemeMode = 'dark' | 'light'

interface ThemeState {
  theme: ThemeMode
  toggleTheme: () => void
  setTheme: (mode: ThemeMode) => void
}

function applyDomTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (mode === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  try {
    localStorage.setItem('attack-lab-theme', mode)
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage
  }
}

const initialTheme: ThemeMode = (() => {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = localStorage.getItem('attack-lab-theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // ignore
  }
  return 'dark'
})()

applyDomTheme(initialTheme)

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  setTheme: (mode) => {
    applyDomTheme(mode)
    set({ theme: mode })
  },
  toggleTheme: () => {
    const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark'
    applyDomTheme(next)
    set({ theme: next })
  },
}))
