import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Compass,
  Grid3X3,
  LayoutDashboard,
  LogOut,
  Moon,
  PlaySquare,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { VersionsResponse } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { useUiStore } from '@/stores/useUiStore'
import { CommandPalette } from './CommandPalette'
import { MitreFooter } from './MitreFooter'
import { TechniqueSlideOver } from '@/components/matrix/TechniqueSlideOver'

const NAV_ITEMS = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/matrix', label: 'Matrix', icon: Grid3X3 },
  { to: '/cases', label: 'Case Studies', icon: PlaySquare },
  { to: '/learn', label: 'Learning Path', icon: BookOpen },
  { to: '/coverage', label: 'Coverage Lab', icon: Target },
  { to: '/explorer', label: 'Explorer', icon: Compass },
  { to: '/whats-new', label: 'Có gì mới', icon: Sparkles },
]

export function AppShell() {
  const { profile, signOut } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)

  const { data: versionsData } = useQuery({
    queryKey: ['versions'],
    queryFn: () => apiFetch<VersionsResponse>('/api/versions'),
  })

  const entVer = versionsData?.domains.find((d) => d.domain === 'enterprise-attack')?.current_version
  const versionLabel = entVer ? `ATT&CK v${entVer} (STIX 2.1)` : 'STIX 2.1 Live Feed'

  return (
    <div className="min-h-screen flex flex-col cyber-grid-bg">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-cyber-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1640px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/40 shadow-neon-cyan">
                <Shield className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <div className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  ATT&amp;CK <span className="text-cyan-500">Lab</span>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cyber Defense Studio
                </div>
              </div>
            </NavLink>

            <nav className="hidden xl:flex items-center gap-1" aria-label="Điều hướng chính">
              {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70',
                    )
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </NavLink>
              ))}
              {profile?.role === 'admin' && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                      isActive
                        ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70',
                    )
                  }
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Admin</span>
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Mở bảng tìm kiếm nhanh Ctrl+K"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/80 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:border-cyan-500/40"
            >
              <Search className="h-3.5 w-3.5 text-cyan-500" />
              <span className="hidden sm:inline">Tìm nhanh...</span>
              <kbd className="rounded bg-white dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Đổi chế độ Sáng / Tối"
              className="rounded-lg border border-slate-200 dark:border-slate-800 p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {profile && (
              <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 px-2.5 py-1.5 text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {profile.display_name}
                </span>
                <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 font-mono text-[10px] uppercase text-cyan-700 dark:text-cyan-300">
                  {profile.role}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-500/20 dark:text-rose-300 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1640px] px-4 py-5 sm:px-6">
        <Outlet />
      </main>

      <MitreFooter versionLabel={versionLabel} />
      <TechniqueSlideOver />
      <CommandPalette />
    </div>
  )
}
