import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Command } from 'cmdk'
import {
  BookOpen,
  Compass,
  Grid3X3,
  PlaySquare,
  Search,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { SearchResultItem } from '@/lib/types'
import { useUiStore } from '@/stores/useUiStore'

export function CommandPalette() {
  const navigate = useNavigate()
  const { commandPaletteOpen, setCommandPaletteOpen, openTechnique } = useUiStore()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 180)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      } else if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  const { data } = useQuery({
    queryKey: ['global-search', debounced],
    enabled: commandPaletteOpen && debounced.length >= 1,
    queryFn: () =>
      apiFetch<{ results: SearchResultItem[] }>(
        `/api/search?q=${encodeURIComponent(debounced)}&include_deprecated=true&limit=20`,
      ),
  })

  if (!commandPaletteOpen) return null

  const runAndClose = (fn: () => void) => {
    setCommandPaletteOpen(false)
    setQuery('')
    fn()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bảng tìm kiếm nhanh ATT&CK Lab"
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/65 backdrop-blur-sm pt-20 px-4"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-cyber-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} className="w-full">
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-4">
            <Search className="h-4 w-4 text-cyan-500 mr-3 shrink-0" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Nhập mã hoặc tên (vd: T1059, Prompt, APT32, SolarWinds, DET0053)..."
              className="h-12 w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(false)}
              className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Command.List className="max-h-96 overflow-y-auto p-2">
            {debounced.length > 0 && (data?.results ?? []).length === 0 && (
              <Command.Empty className="py-8 text-center text-xs text-slate-500">
                Không tìm thấy đối tượng phù hợp với &ldquo;{debounced}&rdquo;.
              </Command.Empty>
            )}

            {(data?.results ?? []).length > 0 && (
              <Command.Group
                heading="Kết quả từ cơ sở dữ liệu MITRE ATT&CK"
                className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                {(data?.results ?? []).map((item) => (
                  <Command.Item
                    key={`${item.domain}-${item.type}-${item.attack_id}`}
                    value={`${item.attack_id} ${item.name}`}
                    onSelect={() =>
                      runAndClose(() => {
                        if (item.type === 'attack-pattern') {
                          openTechnique(item.attack_id, item.domain)
                        } else if (item.type === 'intrusion-set') {
                          navigate(`/explorer?tab=groups&id=${encodeURIComponent(item.attack_id)}&domain=${item.domain}`)
                        } else if (item.type === 'malware' || item.type === 'tool') {
                          navigate(`/explorer?tab=software&id=${encodeURIComponent(item.attack_id)}&domain=${item.domain}`)
                        } else if (item.type === 'campaign') {
                          navigate(`/explorer?tab=campaigns&id=${encodeURIComponent(item.attack_id)}&domain=${item.domain}`)
                        } else {
                          navigate(`/matrix?domain=${item.domain}&q=${encodeURIComponent(item.attack_id)}`)
                        }
                      })
                    }
                    className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-xs text-slate-700 dark:text-slate-200 aria-selected:bg-cyan-500/15 aria-selected:text-cyan-700 dark:aria-selected:text-cyan-300"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="rounded bg-slate-200 dark:bg-slate-800 px-2 py-0.5 font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                        {item.attack_id}
                      </span>
                      <span className="font-medium">{item.name}</span>
                      {(item.revoked || item.deprecated) && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-600 dark:text-amber-300">
                          Deprecated → {item.replaced_by_attack_id ?? 'N/A'}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      {item.domain.replace('-attack', '')} • {item.type}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading="Điều hướng nhanh các phân hệ"
              className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            >
              {[
                { label: 'Mở Matrix Explorer (Enterprise 15 Tactics)', to: '/matrix', icon: Grid3X3 },
                { label: 'Xem Case Studies & Attack Chain Player', to: '/cases', icon: PlaySquare },
                { label: 'Bắt đầu Lộ trình học (Learning Path)', to: '/learn', icon: BookOpen },
                { label: 'Đánh giá độ phủ phát hiện (Coverage Lab)', to: '/coverage', icon: Target },
                { label: 'Tra cứu Groups, Software & Campaigns', to: '/explorer', icon: Compass },
                { label: 'Xem Có gì mới giữa các phiên bản ATT&CK', to: '/whats-new', icon: Sparkles },
              ].map(({ label, to, icon: Icon }) => (
                <Command.Item
                  key={to}
                  value={label}
                  onSelect={() => runAndClose(() => navigate(to))}
                  className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-700 dark:text-slate-200 aria-selected:bg-cyan-500/15"
                >
                  <Icon className="h-4 w-4 text-cyan-500" />
                  <span>{label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
