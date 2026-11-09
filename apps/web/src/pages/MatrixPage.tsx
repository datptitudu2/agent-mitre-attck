import { memo, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Fuse from 'fuse.js'
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  Flame,
  Filter,
  Info,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { getTacticMeta } from '@/lib/tacticTheme'
import type {
  AttackDomain,
  MatrixPayload,
  MatrixTacticColumn,
  MatrixTechniqueItem,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { useBookmarks, useCoverageLayers } from '@/hooks/useUserData'
import { useUiStore } from '@/stores/useUiStore'

type HeatmapMode = 'off' | 'popularity' | 'coverage'

const DOMAIN_TABS: Array<{ id: AttackDomain; label: string; desc: string }> = [
  { id: 'enterprise-attack', label: 'Enterprise', desc: 'IT, Cloud, Windows/Linux/macOS, AI' },
  { id: 'mobile-attack', label: 'Mobile', desc: 'Android & iOS' },
  { id: 'ics-attack', label: 'ICS / OT', desc: 'Hệ thống điều khiển công nghiệp' },
]

function heatColorClass(ratio: number): string {
  if (ratio <= 0) return ''
  if (ratio < 0.2) return 'border-l-4 border-l-cyan-500/60 bg-cyan-500/[0.06]'
  if (ratio < 0.45) return 'border-l-4 border-l-amber-500/70 bg-amber-500/[0.09]'
  if (ratio < 0.75) return 'border-l-4 border-l-orange-500/80 bg-orange-500/[0.13]'
  return 'border-l-4 border-l-rose-500 bg-rose-500/[0.18]'
}

interface TacticColumnProps {
  column: MatrixTacticColumn
  domain: AttackDomain
  heatmapMode: HeatmapMode
  maxUsage: number
  bookmarkedIds: Set<string>
  coveredIds: Map<string, number>
  onOpenTechnique: (attackId: string, domain: AttackDomain) => void
}

const TacticColumnCard = memo(function TacticColumnCard({
  column,
  domain,
  heatmapMode,
  maxUsage,
  bookmarkedIds,
  coveredIds,
  onOpenTechnique,
}: TacticColumnProps) {
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({})
  const meta = getTacticMeta(column.shortname)
  const Icon = meta.icon

  const toggleSub = (attackId: string) => {
    setExpandedParents((prev) => ({ ...prev, [attackId]: !prev[attackId] }))
  }

  return (
    <div className="flex w-[248px] shrink-0 flex-col rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white/80 dark:bg-slate-900/55">
      {/* Sticky Tactic Header */}
      <div
        title={meta.viHint}
        className="sticky top-0 z-10 rounded-t-2xl border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-cyber-surface/95 backdrop-blur-md p-3"
        style={{ borderTop: `3px solid ${meta.accentHex}` }}
      >
        <div className="flex items-center justify-between gap-1.5">
          <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {column.attack_id}
          </span>
          <div className="flex items-center gap-1">
            {meta.isSplitV19 && (
              <span className="rounded bg-pink-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-pink-600 dark:text-pink-300">
                v19 Split
              </span>
            )}
            <span className="rounded-full bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700 dark:text-slate-300">
              {column.techniques.length}
            </span>
          </div>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <Icon className="h-4 w-4 shrink-0" style={{ color: meta.accentHex }} />
          <h3 className="font-display text-xs font-bold leading-snug text-slate-900 dark:text-white truncate">
            {column.name}
          </h3>
        </div>
        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 truncate">
          {meta.viTitle}
        </p>
      </div>

      {/* Danh sách Technique trong cột */}
      <div className="flex-1 space-y-1.5 p-2">
        {column.techniques.map((tech: MatrixTechniqueItem) => {
          const isExpanded = Boolean(expandedParents[tech.attack_id])
          const isBookmarked = bookmarkedIds.has(tech.attack_id)
          const covScore = coveredIds.get(tech.attack_id)

          let heatClass = ''
          if (heatmapMode === 'popularity' && maxUsage > 0) {
            heatClass = heatColorClass(tech.usage_count / maxUsage)
          } else if (heatmapMode === 'coverage') {
            heatClass =
              covScore !== undefined
                ? covScore >= 70
                  ? 'border-l-4 border-l-emerald-500 bg-emerald-500/15'
                  : 'border-l-4 border-l-amber-500 bg-amber-500/15'
                : 'opacity-65'
          }

          return (
            <div
              key={tech.attack_id}
              className={cn(
                'rounded-xl border border-slate-200/80 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-950/60 transition-colors hover:border-cyan-500/50',
                heatClass,
              )}
            >
              <div className="flex items-start justify-between gap-1 p-2">
                <button
                  type="button"
                  onClick={() => onOpenTechnique(tech.attack_id, domain)}
                  className="flex-1 text-left"
                >
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-mono text-[10px] font-semibold text-cyan-700 dark:text-cyan-400">
                      {tech.attack_id}
                    </span>
                    {tech.is_new && (
                      <span className="rounded bg-emerald-500/20 px-1 py-0.2 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-300">
                        NEW
                      </span>
                    )}
                    {!tech.is_new && tech.is_changed && (
                      <span className="rounded bg-amber-500/15 px-1 py-0.2 font-mono text-[9px] text-amber-600 dark:text-amber-300">
                        Đổi
                      </span>
                    )}
                    {isBookmarked && (
                      <Bookmark className="h-3 w-3 text-amber-400 fill-amber-400" />
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium leading-snug text-slate-800 dark:text-slate-100">
                    {tech.name}
                  </div>
                  {heatmapMode === 'popularity' && tech.usage_count > 0 && (
                    <div className="mt-1 font-mono text-[9px] text-rose-500 dark:text-rose-300">
                      {tech.usage_count} Groups/Software
                    </div>
                  )}
                </button>

                {tech.subtechnique_count > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleSub(tech.attack_id)}
                    aria-expanded={isExpanded}
                    aria-label={`Mở ${tech.subtechnique_count} sub-techniques của ${tech.attack_id}`}
                    className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 hover:text-cyan-500"
                  >
                    <span>.{tech.subtechnique_count}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>

              {/* Accordion Sub-techniques (chỉ mount khi mở để cuộn 60fps siêu mượt) */}
              {isExpanded && tech.subtechniques.length > 0 && (
                <div className="border-t border-slate-200/70 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/70 p-1.5 space-y-1">
                  {tech.subtechniques.map((sub) => (
                    <button
                      key={sub.attack_id}
                      type="button"
                      onClick={() => onOpenTechnique(sub.attack_id, domain)}
                      className="flex w-full items-center justify-between gap-1 rounded-lg px-2 py-1 text-left text-[10px] hover:bg-cyan-500/10"
                    >
                      <span className="truncate text-slate-700 dark:text-slate-200">
                        <span className="font-mono text-cyan-600 dark:text-cyan-400 mr-1">
                          {sub.attack_id.split('.')[1] ? `.${sub.attack_id.split('.')[1]}` : sub.attack_id}
                        </span>
                        {sub.name}
                      </span>
                      {sub.is_new && (
                        <span className="rounded bg-emerald-500/20 px-1 font-mono text-[8px] text-emerald-400 shrink-0">
                          NEW
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

export function MatrixPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const openTechnique = useUiStore((s) => s.openTechnique)

  const domainParam = (searchParams.get('domain') as AttackDomain) || 'enterprise-attack'
  const domain: AttackDomain = DOMAIN_TABS.some((d) => d.id === domainParam)
    ? domainParam
    : 'enterprise-attack'

  const [searchText, setSearchText] = useState(searchParams.get('q') ?? '')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('ALL')
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('off')
  const [onlyNew, setOnlyNew] = useState(false)
  const [onlyBookmarked, setOnlyBookmarked] = useState(false)
  const [showSplitBanner, setShowSplitBanner] = useState(true)

  const { data: matrix, isLoading } = useQuery({
    queryKey: ['matrix', domain],
    queryFn: () => apiFetch<MatrixPayload>(`/api/matrix/${domain}`),
  })

  const { bookmarks } = useBookmarks()
  const { layers } = useCoverageLayers(domain)

  const bookmarkedIds = useMemo(
    () =>
      new Set(
        bookmarks.filter((b) => b.domain === domain).map((b) => b.attack_id),
      ),
    [bookmarks, domain],
  )

  const coveredIds = useMemo(() => {
    const map = new Map<string, number>()
    const activeLayer = layers[0]
    if (activeLayer) {
      for (const item of activeLayer.techniques ?? []) {
        map.set(item.techniqueID, item.score ?? 100)
      }
    }
    return map
  }, [layers])

  // Chỉ mục Fuse.js trên client cho phản hồi gõ phím tức thì (< 5ms)
  const matchedIds = useMemo(() => {
    const q = searchText.trim()
    if (!q || !matrix) return null

    const catalog: Array<{ attack_id: string; name: string; sub_names: string }> = []
    for (const col of matrix.tactics) {
      for (const t of col.techniques) {
        catalog.push({
          attack_id: t.attack_id,
          name: t.name,
          sub_names: t.subtechniques
            .map((s) => `${s.attack_id} ${s.name}`)
            .join(' '),
        })
      }
    }

    const fuse = new Fuse(catalog, {
      keys: [
        { name: 'attack_id', weight: 2 },
        { name: 'name', weight: 1.5 },
        { name: 'sub_names', weight: 1 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
    })

    return new Set(fuse.search(q).map((r) => r.item.attack_id))
  }, [matrix, searchText])

  const { filteredColumns, maxUsage, visibleTechCount } = useMemo(() => {
    if (!matrix) {
      return { filteredColumns: [] as MatrixTacticColumn[], maxUsage: 1, visibleTechCount: 0 }
    }

    let highest = 1
    const uniqueVisible = new Set<string>()

    const cols = matrix.tactics.map((col) => {
      const techs = col.techniques.filter((t) => {
        if (matchedIds && !matchedIds.has(t.attack_id)) return false
        if (selectedPlatform !== 'ALL' && !t.platforms.includes(selectedPlatform)) {
          const subHasPlatform = t.subtechniques.some((s) =>
            s.platforms.includes(selectedPlatform),
          )
          if (!subHasPlatform) return false
        }
        if (onlyNew && !t.is_new && !t.subtechniques.some((s) => s.is_new)) {
          return false
        }
        if (onlyBookmarked && !bookmarkedIds.has(t.attack_id)) {
          return false
        }
        return true
      })

      for (const t of techs) {
        uniqueVisible.add(t.attack_id)
        if (t.usage_count > highest) highest = t.usage_count
      }

      return { ...col, techniques: techs }
    })

    return {
      filteredColumns: cols,
      maxUsage: highest,
      visibleTechCount: uniqueVisible.size,
    }
  }, [matrix, matchedIds, selectedPlatform, onlyNew, onlyBookmarked, bookmarkedIds])

  const switchDomain = (next: AttackDomain) => {
    setSelectedPlatform('ALL')
    setSearchParams({ domain: next })
  }

  return (
    <div className="space-y-4">
      {/* Thanh tiêu đề & chuyển Domain */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Matrix Explorer</span>
            {matrix && (
              <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 font-mono text-xs text-cyan-700 dark:text-cyan-300">
                v{matrix.version} • {matrix.tactics.length} Tactics • {visibleTechCount} Techniques
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Nhấn vào bất kỳ Technique nào để mở bảng phân tích Detection Strategy → Analytic → Data Component ngay tại chỗ.
          </p>
        </div>

        <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-1">
          {DOMAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchDomain(tab.id)}
              title={tab.desc}
              className={cn(
                'rounded-xl px-4 py-2 text-xs font-semibold transition-all',
                domain === tab.id
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Banner giải thích việc tách Defense Evasion -> Stealth & Defense Impairment (v19+) */}
      {domain === 'enterprise-attack' && showSplitBanner && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-purple-500/35 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 px-4 py-3 text-xs text-slate-700 dark:text-slate-200">
          <div className="flex items-start gap-2.5">
            <Info className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý cho người học:</strong> Nhiều giáo trình cũ vẫn ghi Enterprise có{' '}
              <em>&ldquo;14 Tactics&rdquo;</em>. Từ <strong>ATT&amp;CK v19 (04/2026)</strong>, tactic{' '}
              <code>Defense Evasion (TA0005)</code> đã được tách thành{' '}
              <strong className="text-purple-600 dark:text-purple-300">Stealth (TA0005 — ẩn mình ngụy trang)</strong>{' '}
              và{' '}
              <strong className="text-pink-600 dark:text-pink-300">
                Defense Impairment (TA0112 — chủ động tắt/phá công cụ bảo mật)
              </strong>
              , nâng tổng số lên <strong>15 cột Tactic</strong>.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSplitBanner(false)}
            aria-label="Ẩn thông báo giải thích 15 tactics"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Thanh công cụ Lọc, Tìm kiếm & Heatmap */}
      <div className="glass-card rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Lọc nhanh theo ID hoặc tên (vd: Prompt, PowerShell, T1562)..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Lọc Platform (bao gồm AI của v20!) */}
          <div className="inline-flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              aria-label="Lọc theo nền tảng Platform"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">Tất cả Platform ({matrix?.platforms.length ?? 0})</option>
              {(matrix?.platforms ?? []).map((pf) => (
                <option key={pf} value={pf}>
                  {pf}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setOnlyNew((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
              onlyNew
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Mới ở bản này</span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyBookmarked((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
              onlyBookmarked
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300',
            )}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>Bookmark ({bookmarkedIds.size})</span>
          </button>
        </div>

        {/* Chế độ Heatmap */}
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Heatmap:</span>
          {(
            [
              { id: 'off', label: 'Tắt' },
              { id: 'popularity', label: 'Độ phổ biến thực tế' },
              { id: 'coverage', label: 'Coverage của tôi' },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setHeatmapMode(mode.id)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                heatmapMode === mode.id
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/40'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bảng Ma trận cuộn ngang & dọc mượt 60fps */}
      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-[540px] w-[248px] shrink-0 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/60"
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto pb-4 max-h-[calc(100vh-250px)] rounded-2xl">
          <div className="flex items-start gap-3 min-w-max pr-2">
            {filteredColumns.map((col) => (
              <TacticColumnCard
                key={col.attack_id}
                column={col}
                domain={domain}
                heatmapMode={heatmapMode}
                maxUsage={maxUsage}
                bookmarkedIds={bookmarkedIds}
                coveredIds={coveredIds}
                onOpenTechnique={openTechnique}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
