import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Download,
  ExternalLink,
  Plus,
  Save,
  Search,
  Share2,
  Sparkles,
  Target,
  Trash2,
  Upload,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { getTacticMeta } from '@/lib/tacticTheme'
import type { AttackDomain, MatrixPayload } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  type CoverageLayerTechnique,
  useCoverageLayers,
} from '@/hooks/useUserData'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUiStore } from '@/stores/useUiStore'

export function CoveragePage() {
  const user = useAuthStore((s) => s.profile)
  const openTechnique = useUiStore((s) => s.openTechnique)

  const [domain, setDomain] = useState<AttackDomain>('enterprise-attack')
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null)
  const [layerName, setLayerName] = useState('SOC Detection Layer #1')
  const [layerShared, setLayerShared] = useState(false)
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const { data: matrix } = useQuery({
    queryKey: ['matrix', domain],
    queryFn: () => apiFetch<MatrixPayload>(`/api/matrix/${domain}`),
  })

  const { layers, saveLayer, deleteLayer } = useCoverageLayers(domain)

  // Khởi tạo layer đầu tiên nếu có sẵn trong Supabase
  useEffect(() => {
    if (layers.length > 0 && !selectedLayerId) {
      const first = layers[0]
      setSelectedLayerId(first.id)
      setLayerName(first.name)
      setLayerShared(first.shared)
      const next: Record<string, number> = {}
      for (const t of first.techniques ?? []) {
        if (t.techniqueID) next[t.techniqueID] = t.score ?? 100
      }
      setScoreMap(next)
    }
  }, [layers, selectedLayerId])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  const handleCycleScore = (attackId: string) => {
    setScoreMap((prev) => {
      const cur = prev[attackId] ?? 0
      const next = { ...prev }
      if (cur === 0) next[attackId] = 100
      else if (cur === 100) next[attackId] = 50
      else delete next[attackId]
      return next
    })
  }

  // Tính danh sách kỹ thuật duy nhất + % bao phủ theo từng Tactic + Gợi ý lỗ hổng phổ biến
  const analysis = useMemo(() => {
    if (!matrix) {
      return {
        totalUnique: 0,
        coveredCount: 0,
        overallPct: 0,
        tacticStats: [],
        topUncovered: [],
      }
    }

    const uniqueTechs = new Map<
      string,
      { attack_id: string; name: string; usage_count: number; tactics: string[] }
    >()

    const tacticStats = matrix.tactics.map((col) => {
      let colCovered = 0
      for (const t of col.techniques) {
        const existing = uniqueTechs.get(t.attack_id)
        if (!existing) {
          uniqueTechs.set(t.attack_id, {
            attack_id: t.attack_id,
            name: t.name,
            usage_count: t.usage_count,
            tactics: [col.shortname],
          })
        } else {
          existing.tactics.push(col.shortname)
        }
        if ((scoreMap[t.attack_id] ?? 0) > 0) colCovered += 1
      }
      const pct = col.techniques.length
        ? Math.round((colCovered / col.techniques.length) * 100)
        : 0
      return {
        shortname: col.shortname,
        name: col.name,
        total: col.techniques.length,
        covered: colCovered,
        pct,
      }
    })

    const allUnique = Array.from(uniqueTechs.values())
    const coveredCount = allUnique.filter((t) => (scoreMap[t.attack_id] ?? 0) > 0).length
    const overallPct = allUnique.length
      ? Math.round((coveredCount / allUnique.length) * 100)
      : 0

    const topUncovered = allUnique
      .filter((t) => (scoreMap[t.attack_id] ?? 0) === 0 && t.usage_count > 0)
      .sort((a, b) => b.usage_count - a.usage_count)
      .slice(0, 10)

    return {
      totalUnique: allUnique.length,
      coveredCount,
      overallPct,
      tacticStats,
      topUncovered,
    }
  }, [matrix, scoreMap])

  const buildTechniquesPayload = (): CoverageLayerTechnique[] =>
    Object.entries(scoreMap).map(([tid, sc]) => ({
      techniqueID: tid,
      score: sc,
      color: sc >= 70 ? '#10b981' : '#f59e0b',
      comment: sc >= 70 ? 'Đã có khả năng phát hiện tốt' : 'Phát hiện một phần',
    }))

  const handleSaveLayer = async () => {
    const saved = await saveLayer.mutateAsync({
      id: selectedLayerId ?? undefined,
      name: layerName.trim() || 'SOC Coverage Layer',
      description: `Cập nhật từ ATT&CK Lab (${domain})`,
      domain,
      techniques: buildTechniquesPayload(),
      shared: layerShared,
    })
    setSelectedLayerId(saved.id)
    showToast('Đã lưu Coverage Layer vào Supabase thành công!')
  }

  const handleExportNavigator = async () => {
    let navJson: Record<string, unknown>
    if (selectedLayerId) {
      // Lưu đồng bộ trước rồi gọi chuẩn endpoint /api/export/navigator
      const saved = await saveLayer.mutateAsync({
        id: selectedLayerId,
        name: layerName.trim() || 'SOC Coverage Layer',
        description: `Xuất từ ATT&CK Lab (${domain})`,
        domain,
        techniques: buildTechniquesPayload(),
        shared: layerShared,
      })
      navJson = await apiFetch<Record<string, unknown>>(
        `/api/export/navigator?layer_id=${encodeURIComponent(saved.id)}`,
      )
    } else {
      const majorVer = (matrix?.version ?? '20').split('.')[0]
      navJson = {
        name: layerName.trim() || 'ATT&CK Lab Coverage Layer',
        versions: { attack: majorVer, navigator: '5.1.0', layer: '4.5' },
        domain,
        description: 'Xuất trực tiếp từ ATT&CK Lab Coverage Studio',
        sorting: 0,
        layout: {
          layout: 'side',
          aggregateFunction: 'average',
          showID: true,
          showName: true,
          expandedSubtechniques: 'annotated',
        },
        hideDisabled: false,
        techniques: buildTechniquesPayload().map((t) => ({
          ...t,
          enabled: true,
          showSubtechniques: true,
        })),
        gradient: {
          colors: ['#ef4444', '#f59e0b', '#10b981'],
          minValue: 0,
          maxValue: 100,
        },
      }
    }

    const blob = new Blob([JSON.stringify(navJson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${layerName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'coverage'}-navigator.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Đã xuất tệp JSON tương thích ATT&CK Navigator v4.5!')
  }

  const handleImportNavigatorFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as {
        name?: string
        domain?: string
        techniques?: Array<{ techniqueID?: string; score?: number; enabled?: boolean }>
      }
      if (!Array.isArray(parsed.techniques)) {
        throw new Error('Tệp JSON không chứa mảng techniques hợp lệ.')
      }
      if (
        parsed.domain === 'enterprise-attack' ||
        parsed.domain === 'mobile-attack' ||
        parsed.domain === 'ics-attack'
      ) {
        setDomain(parsed.domain)
      }
      if (parsed.name) setLayerName(parsed.name)
      setSelectedLayerId(null)

      const importedMap: Record<string, number> = {}
      for (const item of parsed.techniques) {
        if (item.techniqueID && item.enabled !== false) {
          importedMap[item.techniqueID] = item.score && item.score > 0 ? item.score : 100
        }
      }
      setScoreMap(importedMap)
      showToast(
        `Đã nhập ${Object.keys(importedMap).length} kỹ thuật từ tệp Navigator JSON!`,
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Tệp Navigator JSON không hợp lệ.')
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-500">
            <Target className="h-3.5 w-3.5" />
            <span>Mini ATT&amp;CK Navigator &amp; Gap Analyzer</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Coverage Lab — Đo Độ phủ Phát hiện &amp; Ưu tiên Lỗ hổng
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            Nhấn vào từng Technique để đánh dấu mức độ bao phủ (
            <span className="text-emerald-500 font-semibold">100%: Phát hiện tốt</span> →{' '}
            <span className="text-amber-500 font-semibold">50%: Một phần</span> →{' '}
            <span>Chưa cover</span>), lưu chia sẻ nội bộ team và xuất/nhập JSON chuẩn{' '}
            <strong>ATT&amp;CK Navigator v4.5</strong>.
          </p>
        </div>

        <div className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 self-start">
          {(
            [
              ['enterprise-attack', 'Enterprise'],
              ['mobile-attack', 'Mobile'],
              ['ics-attack', 'ICS / OT'],
            ] as const
          ).map(([dom, label]) => (
            <button
              key={dom}
              type="button"
              onClick={() => {
                setDomain(dom)
                setSelectedLayerId(null)
                setScoreMap({})
              }}
              className={cn(
                'rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                domain === dom
                  ? 'bg-emerald-500 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {toast && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-5 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {toast}
        </div>
      )}

      {/* Thanh Quản lý Layer + Export / Import Navigator */}
      <div className="glass-card rounded-3xl p-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {layers.length > 0 && (
            <select
              aria-label="Chọn Coverage Layer đã lưu"
              value={selectedLayerId ?? ''}
              onChange={(e) => {
                const lid = e.target.value
                if (!lid) return
                const found = layers.find((l) => l.id === lid)
                if (found) {
                  setSelectedLayerId(found.id)
                  setLayerName(found.name)
                  setLayerShared(found.shared)
                  const next: Record<string, number> = {}
                  for (const t of found.techniques ?? []) {
                    next[t.techniqueID] = t.score ?? 100
                  }
                  setScoreMap(next)
                }
              }}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-900 dark:text-white"
            >
              <option value="">-- Đang soạn Layer mới --</option>
              {layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.shared ? '(Shared Team)' : '(Riêng tư)'}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            value={layerName}
            onChange={(e) => setLayerName(e.target.value)}
            placeholder="Tên Layer (vd: SOC Q4 Coverage)..."
            className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white w-64"
          />

          <label className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={layerShared}
              onChange={(e) => setLayerShared(e.target.checked)}
              className="rounded accent-cyan-500"
            />
            <Share2 className="h-3.5 w-3.5 text-cyan-500" />
            <span>Chia sẻ với Team</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedLayerId(null)
              setLayerName(`SOC Coverage Layer #${layers.length + 1}`)
              setScoreMap({})
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-500/40"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tạo mới</span>
          </button>

          <button
            type="button"
            disabled={saveLayer.isPending}
            onClick={() => void handleSaveLayer()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Lưu Layer</span>
          </button>

          <button
            type="button"
            onClick={() => void handleExportNavigator()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 px-3.5 py-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/25"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Navigator JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(e) => void handleImportNavigatorFile(e)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3.5 py-2 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-500/20"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import JSON</span>
          </button>

          {selectedLayerId &&
            layers.find((l) => l.id === selectedLayerId)?.user_id === user?.id && (
              <button
                type="button"
                onClick={async () => {
                  await deleteLayer.mutateAsync(selectedLayerId)
                  setSelectedLayerId(null)
                  setScoreMap({})
                  showToast('Đã xoá Layer.')
                }}
                aria-label="Xoá Layer đang chọn"
                className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-2 text-rose-500 hover:bg-rose-500/20"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
        </div>
      </div>

      {/* Heatmap Độ bao phủ theo từng Tactic + Top Gợi ý Chưa Cover */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 glass-card rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Độ bao phủ theo Tactic ({analysis.coveredCount} / {analysis.totalUnique} Techniques)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tỷ lệ kỹ thuật cấp cha đã có ít nhất một quy tắc phát hiện trong Layer này.
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 px-4 py-2 font-mono text-xl font-bold text-emerald-600 dark:text-emerald-300">
              {analysis.overallPct}%
            </div>
          </div>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
            {analysis.tacticStats.map((ts) => {
              const meta = getTacticMeta(ts.shortname)
              return (
                <div key={ts.shortname} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {ts.name}{' '}
                      <span className="text-[11px] font-normal text-slate-500">
                        ({meta.viTitle})
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {ts.covered}/{ts.total} ({ts.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${ts.pct}%`,
                        backgroundColor: meta.accentHex,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Gợi ý Technique phổ biến chưa được cover */}
        <div className="lg:col-span-5 glass-card rounded-3xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Gợi ý Ưu tiên: Phổ biến nhưng Chưa Cover
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Xếp hạng theo số lượng Group / Software / Campaign thực tế đang sử dụng nhiều nhất trong dữ liệu MITRE hiện hành:
          </p>

          <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
            {analysis.topUncovered.map((u) => (
              <div
                key={u.attack_id}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      {u.attack_id}
                    </span>
                    <span className="rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] text-rose-600 dark:text-rose-300">
                      {u.usage_count} mối đe doạ dùng
                    </span>
                  </div>
                  <div className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {u.name}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCycleScore(u.attack_id)}
                    className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2 py-1 font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30"
                  >
                    + Cover
                  </button>
                  <button
                    type="button"
                    onClick={() => openTechnique(u.attack_id, domain)}
                    title="Xem Detection Strategy"
                    className="rounded-lg border border-slate-300 dark:border-slate-700 p-1 text-slate-500 hover:text-cyan-400"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bảng Checklist Ma trận nhanh để Tick chọn Technique */}
      {matrix && (
        <div className="glass-card rounded-3xl p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Bảng đánh dấu nhanh theo cột Tactic (Nhấn vào ô để đổi trạng thái: 100% → 50% → Tắt)
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Lọc nhanh mã hoặc tên..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-3">
            {matrix.tactics.map((col) => {
              const filteredTechs = col.techniques.filter(
                (t) =>
                  !search.trim() ||
                  t.attack_id.toLowerCase().includes(search.toLowerCase()) ||
                  t.name.toLowerCase().includes(search.toLowerCase()),
              )
              return (
                <div
                  key={col.shortname}
                  className="w-56 shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-2.5 space-y-2"
                >
                  <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                    <div className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400">
                      {col.attack_id}
                    </div>
                    <div className="font-display text-xs font-bold text-slate-900 dark:text-white truncate">
                      {col.name}
                    </div>
                  </div>

                  <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5">
                    {filteredTechs.map((tech) => {
                      const sc = scoreMap[tech.attack_id] ?? 0
                      return (
                        <button
                          key={`${col.shortname}-${tech.attack_id}`}
                          type="button"
                          onClick={() => handleCycleScore(tech.attack_id)}
                          className={cn(
                            'w-full rounded-xl border p-2 text-left text-[11px] transition-all flex items-start justify-between gap-1.5',
                            sc >= 70
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 font-semibold'
                              : sc > 0
                                ? 'border-amber-500 bg-amber-500/20 text-amber-900 dark:text-amber-200 font-semibold'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-700 dark:text-slate-300 hover:border-cyan-500/40',
                          )}
                        >
                          <div className="min-w-0">
                            <div className="font-mono text-[10px] opacity-80">
                              {tech.attack_id}
                            </div>
                            <div className="line-clamp-2 leading-snug">{tech.name}</div>
                          </div>
                          {sc > 0 && (
                            <span className="shrink-0 rounded bg-black/20 px-1 py-0.5 font-mono text-[9px]">
                              {sc}%
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
