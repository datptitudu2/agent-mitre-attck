import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  BookOpen,
  Compass,
  FileCode2,
  Grid3X3,
  LayoutDashboard,
  LogOut,
  Moon,
  PlaySquare,
  Search,
  Settings,
  Sliders,
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
  { to: '/agent', label: 'Agent Planner', icon: Sliders },
  { to: '/rules', label: 'Rule Explorer', icon: FileCode2 },
  { to: '/learn', label: 'Learning Path', icon: BookOpen },
  { to: '/coverage', label: 'Coverage Lab', icon: Target },
  { to: '/explorer', label: 'Explorer', icon: Compass },
  { to: '/whats-new', label: 'Có gì mới', icon: Sparkles },
]

export function AppShell() {
  const { profile, signOut } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const openTechnique = useUiStore((s) => s.openTechnique)

  if (typeof window !== 'undefined') {
    ;(window as any).__openTechnique = openTechnique
    ;(window as any).__THEME_STORE__ = useThemeStore
  }

  const { data: versionsData } = useQuery({
    queryKey: ['versions'],
    queryFn: () => apiFetch<VersionsResponse>('/api/versions'),
  })

  const entVer = versionsData?.domains.find((d) => d.domain === 'enterprise-attack')?.current_version
  const versionLabel = entVer ? `ATT&CK v${entVer} (STIX 2.1)` : 'STIX 2.1 Live Feed'

  return (
    <div className="min-h-screen flex flex-col cyber-grid-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-cyan-500 focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-slate-950"
      >
        Chuyển tới nội dung chính
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-ink-950 text-bone-100 shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1640px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xs border border-attack/40 bg-attack-muted/20 text-attack font-mono font-bold text-xs">
                ▲
              </div>
              <div>
                <div className="font-display text-base font-bold tracking-tight text-bone-100">
                  ATT&amp;CK <span className="text-attack">Lab</span>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-bone-500">
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
                      'inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-xs font-mono transition-colors border',
                      isActive
                        ? 'border-line-strong bg-ink-850 text-bone-100 font-bold'
                        : 'border-transparent text-bone-400 hover:text-bone-100 hover:border-line',
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
                      'inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1.5 text-xs font-mono transition-colors border',
                      isActive
                        ? 'border-caution/50 bg-caution/10 text-caution font-bold'
                        : 'border-transparent text-bone-400 hover:text-bone-100 hover:border-line',
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
              className="inline-flex items-center gap-2 rounded-xs border border-line bg-ink-900 px-3 py-1.5 text-xs text-bone-300 hover:border-line-strong hover:text-bone-100 font-mono transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-bone-400" />
              <span className="hidden sm:inline">Tìm kiếm...</span>
              <kbd className="rounded-xs border border-line bg-ink-950 px-1.5 py-0.5 font-mono text-[10px] text-bone-400">
                Ctrl K
              </kbd>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Đổi chế độ Sáng / Tối"
              className="rounded-xs border border-line bg-ink-900 p-2 text-bone-300 hover:border-line-strong hover:text-bone-100 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-caution" />
              ) : (
                <Moon className="h-4 w-4 text-bone-100" />
              )}
            </button>

            {profile && (
              <div className="hidden md:flex items-center gap-2 rounded-xs border border-line bg-ink-900 px-2.5 py-1.5 text-xs font-mono">
                <span className="font-medium text-bone-200">
                  {profile.display_name}
                </span>
                <span className="rounded-xs border border-defend/30 bg-defend-muted/20 px-1.5 py-0.5 font-mono text-[10px] uppercase text-defend font-bold">
                  {profile.role}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-1.5 rounded-xs border border-line bg-ink-900 px-2.5 py-1.5 text-xs font-mono text-bone-300 hover:border-attack/50 hover:text-attack transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Thanh điều hướng cuộn ngang cho Tablet & Màn hình nhỏ (< 1280px) — 100% Nền ĐẶC không bị đè chữ */}
        <nav
          aria-label="Điều hướng di động và máy tính bảng"
          className="xl:hidden flex items-center gap-1 overflow-x-auto border-t border-line bg-ink-950 px-4 py-2 font-mono text-xs"
        >
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-mono shrink-0 border',
                  isActive
                    ? 'border-line-strong bg-ink-850 text-bone-100 font-bold'
                    : 'border-transparent text-bone-400 hover:text-bone-100',
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
                  'inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-mono shrink-0 border',
                  isActive
                    ? 'border-caution/50 bg-caution/10 text-caution font-bold'
                    : 'border-transparent text-bone-400 hover:text-bone-100',
                )
              }
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Admin</span>
            </NavLink>
          )}
        </nav>
      </header>

      <main
        id="main-content"
        className="flex-1 mx-auto w-full max-w-[1640px] px-4 pt-4 pb-8 sm:pt-6 sm:pb-12 scroll-mt-28"
      >
        <Outlet />
      </main>

      <MitreFooter versionLabel={versionLabel} />
      <TechniqueSlideOver />
      <CommandPalette />
    </div>
  )
}
