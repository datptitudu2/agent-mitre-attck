
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AlertOctagon,
  ArrowRight,
  GitCompare,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { AttackDomain, DiffChangeItem, VersionDiffResponse } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/useUiStore'

type DiffTab = 'added' | 'modified' | 'deprecated' | 'revoked'

export function WhatsNewPage() {
  const openTechnique = useUiStore((s) => s.openTechnique)
  const [domain, setDomain] = useState<AttackDomain>('enterprise-attack')
  const [fromVer, setFromVer] = useState<string>('')
  const [toVer, setToVer] = useState<string>('')
  const [activeTab, setActiveTab] = useState<DiffTab>('added')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const handleDomainChange = (nextDomain: AttackDomain) => {
    setDomain(nextDomain)
    setFromVer('')
    setToVer('')
  }

  const queryParams = new URLSearchParams({ domain })
  if (fromVer) queryParams.set('from', fromVer)
  if (toVer) queryParams.set('to', toVer)

  const { data, isLoading, error } = useQuery({
    queryKey: ['version-diff', domain, fromVer, toVer],
    queryFn: () => apiFetch<VersionDiffResponse>(`/api/diff?${queryParams.toString()}`),
  })

  const available = data?.available_versions ?? []
  const currentList: DiffChangeItem[] = useMemo(() => {
    if (!data) return []
    const raw = data[activeTab] ?? []
    return raw.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        return (
          item.attack_id.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [data, activeTab, typeFilter, search])

  const objectTypes = useMemo(() => {
    if (!data) return []
    const s = new Set<string>()
    for (const item of [
      ...data.added,
      ...data.modified,
      ...data.deprecated,
      ...data.revoked,
    ]) {
      s.add(item.type)
    }
    return Array.from(s).sort()
  }, [data])

  return (
    <div className="space-y-6">
      {/* Header + Bộ chọn Domain & Version */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            <GitCompare className="h-3.5 w-3.5" />
            <span>STIX Snapshot Diff Engine</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Có gì mới giữa các Phiên bản MITRE ATT&amp;CK
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Đối chiếu trực tiếp bảng băm <code className="font-mono">attack_object_snapshots</code> để phát hiện Technique, Detection Strategy &amp; Analytic mới thêm, sửa đổi hoặc ngừng sử dụng.
          </p>
        </div>

        {/* Chuyển đổi Domain */}
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
              onClick={() => handleDomainChange(dom)}
              className={cn(
                'rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                domain === dom
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Thanh chọn cặp Version so sánh */}
      {data && (
        <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              So sánh từ bản:
            </span>
            <select
              aria-label="Phiên bản cũ"
              value={data.from_version}
              onChange={(e) => setFromVer(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-white"
            >
              {available.map((v) => (
                <option key={v} value={v}>
                  v{v}
                </option>
              ))}
            </select>

            <ArrowRight className="h-4 w-4 text-cyan-500" />

            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              tới bản:
            </span>
            <select
              aria-label="Phiên bản mới"
              value={data.to_version}
              onChange={(e) => setToVer(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-white"
            >
              {available.map((v) => (
                <option key={v} value={v}>
                  v{v}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {available.length >= 3 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setFromVer(available[available.length - 1])
                    setToVer(available[0])
                  }}
                  className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 font-mono text-xs text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20"
                >
                  So sánh bước nhảy Major (v{available[available.length - 1]} → v{available[0]})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFromVer(available[1])
                    setToVer(available[0])
                  }}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-mono text-xs text-slate-600 dark:text-slate-300 hover:border-cyan-500/40"
                >
                  Bản vá liền kề (v{available[1]} → v{available[0]})
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="h-72 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
      )}

      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-200">
          {error instanceof Error ? error.message : 'Không tải được dữ liệu so sánh phiên bản.'}
        </div>
      )}

      {data && (
        <>
          {/* 4 Thẻ Thống kê Thay đổi */}
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            {(
              [
                {
                  key: 'added' as const,
                  label: 'Mới bổ sung (NEW)',
                  count: data.counts.added,
                  icon: PlusCircle,
                  cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                },
                {
                  key: 'modified' as const,
                  label: 'Cập nhật nội dung',
                  count: data.counts.modified,
                  icon: RefreshCw,
                  cls: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
                },
                {
                  key: 'deprecated' as const,
                  label: 'Deprecated (Ngừng dùng)',
                  count: data.counts.deprecated,
                  icon: AlertOctagon,
                  cls: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
                },
                {
                  key: 'revoked' as const,
                  label: 'Revoked (Đã thay thế)',
                  count: data.counts.revoked,
                  icon: Sparkles,
                  cls: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
                },
              ]
            ).map(({ key, label, count, icon: Icon, cls }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all',
                  activeTab === key ? cls : 'glass-card hover:border-cyan-500/40',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
                    {count.toLocaleString('vi-VN')}
                  </span>
                  <Icon className="h-5 w-5 opacity-80" />
                </div>
                <div className="mt-1 text-xs font-semibold">{label}</div>
              </button>
            ))}
          </div>

          {/* Bộ lọc chi tiết */}
          <div className="glass-card rounded-3xl p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm nhanh theo mã hoặc tên (vd: Prompt, T1699, DET)..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-xs text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTypeFilter('all')}
                  className={cn(
                    'rounded-lg px-2.5 py-1 font-mono text-[11px] font-semibold',
                    typeFilter === 'all'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                  )}
                >
                  Tất cả ({data[activeTab].length})
                </button>
                {objectTypes.map((ot) => (
                  <button
                    key={ot}
                    type="button"
                    onClick={() => setTypeFilter(ot)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 font-mono text-[11px]',
                      typeFilter === ot
                        ? 'bg-cyan-500 text-slate-950 font-semibold'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                    )}
                  >
                    {ot.replace('x-mitre-', '')}
                  </button>
                ))}
              </div>
            </div>

            {currentList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Không có mục thay đổi nào khớp bộ lọc giữa v{data.from_version} và v{data.to_version}.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-[540px] overflow-y-auto pr-1">
                {currentList.slice(0, 180).map((item) => {
                  const isTech = item.type === 'attack-pattern'
                  return (
                    <div
                      key={item.stix_id}
                      onClick={() => {
                        if (isTech && item.attack_id) {
                          openTechnique(item.attack_id, domain)
                        }
                      }}
                      className={cn(
                        'rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3 text-xs space-y-1 transition-colors',
                        isTech && 'cursor-pointer hover:border-cyan-500/50',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {item.attack_id || 'STIX'}
                        </span>
                        <span className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                          {item.type.replace('x-mitre-', '')}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.name}
                      </div>
                      {item.replaced_by_attack_id && (
                        <div className="font-mono text-[11px] text-amber-600 dark:text-amber-300">
                          Thay thế bởi → {item.replaced_by_attack_id}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
