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
import type { CurriculumResponse, SearchResultItem } from '@/lib/types'
import { useUiStore } from '@/stores/useUiStore'

export function CommandPalette() {
  const navigate = useNavigate()
  const { commandPaletteOpen, setCommandPaletteOpen, openTechnique } = useUiStore()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 200)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  const { data } = useQuery({
    queryKey: ['search', debounced],
    enabled: debounced.length >= 2,
    queryFn: () =>
      apiFetch<{ results: SearchResultItem[] }>(
        `/api/search?q=${encodeURIComponent(debounced)}&include_deprecated=true&limit=15`,
      ),
  })

  const { data: curriculum } = useQuery({
    queryKey: ['curriculum'],
    enabled: commandPaletteOpen,
    queryFn: () => apiFetch<CurriculumResponse>('/api/lessons'),
  })

  if (!commandPaletteOpen) return null

  const matchedLessons = (curriculum?.lessons ?? []).filter((l) =>
    debounced.length >= 2
      ? l.title.toLowerCase().includes(debounced.toLowerCase()) ||
        l.slug.toLowerCase().includes(debounced.toLowerCase())
      : false,
  )

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
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/80 backdrop-blur-md pt-20 px-4"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-xs border border-line-strong bg-ink-900 shadow-2xl font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} className="w-full">
          <div className="flex items-center border-b border-line px-4 bg-ink-950">
            <Search className="h-4 w-4 text-attack mr-3 shrink-0" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Nhập mã hoặc tên (vd: T1059, Prompt, APT32, SolarWinds, DET0053)..."
              className="h-12 w-full bg-transparent text-sm text-bone-100 placeholder:text-bone-500 focus:outline-none font-mono"
            />
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(false)}
              className="rounded-xs p-1 text-bone-400 hover:text-bone-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Command.List className="max-h-96 overflow-y-auto p-2 space-y-1">
            {debounced.length > 0 &&
              (data?.results ?? []).length === 0 &&
              matchedLessons.length === 0 && (
                <Command.Empty className="py-8 text-center font-mono text-xs text-bone-500">
                  Không tìm thấy đối tượng phù hợp với &ldquo;{debounced}&rdquo;.
                </Command.Empty>
              )}

            {matchedLessons.length > 0 && debounced.length > 0 && (
              <Command.Group
                heading="Bài học trong Learning Path"
                className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-500"
              >
                {matchedLessons.map((l) => (
                  <Command.Item
                    key={l.slug}
                    value={`lesson ${l.title}`}
                    onSelect={() =>
                      runAndClose(() => navigate(`/learn?lesson=${encodeURIComponent(l.slug)}`))
                    }
                    className="flex cursor-pointer items-center justify-between rounded-xs px-3 py-2 text-xs text-bone-200 aria-selected:bg-attack-muted/30 aria-selected:text-bone-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-attack" />
                      <span>
                        Bài {l.order}: {l.title}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-bone-500">{l.reading_minutes}p</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {(data?.results ?? []).length > 0 && (
              <Command.Group
                heading="Kết quả từ cơ sở dữ liệu MITRE ATT&CK"
                className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-500"
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
                    className="flex cursor-pointer items-center justify-between rounded-xs px-3 py-2.5 text-xs text-bone-200 aria-selected:bg-attack-muted/30 aria-selected:text-bone-100 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-xs border border-attack/30 bg-attack-muted/20 px-2 py-0.5 font-mono font-bold text-attack text-xs">
                        {item.attack_id}
                      </span>
                      <span className="font-medium text-bone-100">{item.name}</span>
                      {(item.revoked || item.deprecated) && (
                        <span className="rounded-xs border border-caution/30 bg-caution/10 px-1.5 py-0.5 font-mono text-[10px] text-caution">
                          Deprecated → {item.replaced_by_attack_id ?? 'N/A'}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-bone-500">
                      {item.domain.replace('-attack', '')} • {item.type}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group
              heading="Điều hướng nhanh các phân hệ"
              className="px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-bone-500"
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
                  className="flex cursor-pointer items-center gap-2.5 rounded-xs px-3 py-2 text-xs text-bone-200 aria-selected:bg-line transition-colors"
                >
                  <Icon className="h-4 w-4 text-attack" />
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
