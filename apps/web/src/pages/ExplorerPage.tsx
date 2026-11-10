import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Boxes,
  Compass,
  Flag,
  GitMerge,
  Search,
  Users,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { getTacticMeta } from '@/lib/tacticTheme'
import type {
  AttackDomain,
  EntityDetailResponse,
  EntityListItem,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/useUiStore'

type ExplorerTab = 'groups' | 'software' | 'campaigns' | 'compare'

export function ExplorerPage() {
  const openTechnique = useUiStore((s) => s.openTechnique)
  const [searchParams, setSearchParams] = useSearchParams()

  const tabParam = (searchParams.get('tab') as ExplorerTab) || 'groups'
  const idParam = searchParams.get('id') || ''
  const domParam = (searchParams.get('domain') as AttackDomain) || 'enterprise-attack'

  const [activeTab, setActiveTab] = useState<ExplorerTab>(tabParam)
  const [domain, setDomain] = useState<AttackDomain>(domParam)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string>(idParam)

  // Trạng thái so sánh 2 Group
  const [groupAId, setGroupAId] = useState<string>('G0050')
  const [groupBId, setGroupBId] = useState<string>('G0016')

  useEffect(() => {
    if (tabParam) setActiveTab(tabParam)
    if (idParam) setSelectedId(idParam)
    if (domParam) setDomain(domParam)
  }, [tabParam, idParam, domParam])

  const listEndpoint =
    activeTab === 'software'
      ? `/api/software?domain=${domain}&limit=350`
      : activeTab === 'campaigns'
        ? `/api/campaigns?domain=${domain}`
        : `/api/groups?domain=${domain}`

  const { data: listData, isLoading: isListLoading } = useQuery({
    queryKey: ['entity-list', activeTab === 'compare' ? 'groups' : activeTab, domain],
    queryFn: () =>
      apiFetch<{ count: number; items: EntityListItem[] }>(
        activeTab === 'compare' ? `/api/groups?domain=${domain}` : listEndpoint,
      ),
  })

  const items = listData?.items ?? []

  // Tự chọn phần tử đầu tiên khi tải danh sách xong
  useEffect(() => {
    if (activeTab !== 'compare' && items.length > 0) {
      const exists = items.some((x) => x.attack_id === selectedId)
      if (!exists) {
        setSelectedId(items[0].attack_id)
      }
    } else if (activeTab === 'compare' && items.length >= 2) {
      if (!items.some((x) => x.attack_id === groupAId)) {
        const apt32 = items.find((x) => x.name.includes('APT32'))
        setGroupAId((apt32 ?? items[0]).attack_id)
      }
      if (!items.some((x) => x.attack_id === groupBId)) {
        const apt29 = items.find((x) => x.name.includes('APT29') || x.name.includes('Lazarus'))
        setGroupBId((apt29 ?? items[1]).attack_id)
      }
    }
  }, [items, activeTab, selectedId, groupAId, groupBId])

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter(
      (i) =>
        i.attack_id.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        (i.data?.aliases ?? []).some((a) => a.toLowerCase().includes(q)),
    )
  }, [items, search])

  const detailPath =
    activeTab === 'software'
      ? `/api/software/${encodeURIComponent(selectedId)}?domain=${domain}`
      : activeTab === 'campaigns'
        ? `/api/campaigns/${encodeURIComponent(selectedId)}?domain=${domain}`
        : `/api/groups/${encodeURIComponent(selectedId)}?domain=${domain}`

  const { data: detail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['entity-detail', activeTab, domain, selectedId],
    enabled: activeTab !== 'compare' && Boolean(selectedId),
    queryFn: () => apiFetch<EntityDetailResponse>(detailPath),
  })

  // Dữ liệu 2 Group để vẽ biểu đồ Venn / Overlap
  const { data: groupADetail } = useQuery({
    queryKey: ['group-compare', domain, groupAId],
    enabled: activeTab === 'compare' && Boolean(groupAId),
    queryFn: () =>
      apiFetch<EntityDetailResponse>(
        `/api/groups/${encodeURIComponent(groupAId)}?domain=${domain}`,
      ),
  })

  const { data: groupBDetail } = useQuery({
    queryKey: ['group-compare', domain, groupBId],
    enabled: activeTab === 'compare' && Boolean(groupBId),
    queryFn: () =>
      apiFetch<EntityDetailResponse>(
        `/api/groups/${encodeURIComponent(groupBId)}?domain=${domain}`,
      ),
  })

  const venn = useMemo(() => {
    const mapA = new Map(
      (groupADetail?.techniques ?? []).map((t) => [t.attack_id, t]),
    )
    const mapB = new Map(
      (groupBDetail?.techniques ?? []).map((t) => [t.attack_id, t]),
    )
    const shared = []
    const onlyA = []
    const onlyB = []

    for (const [id, t] of mapA.entries()) {
      if (mapB.has(id)) shared.push(t)
      else onlyA.push(t)
    }
    for (const [id, t] of mapB.entries()) {
      if (!mapA.has(id)) onlyB.push(t)
    }

    const unionSize = onlyA.length + shared.length + onlyB.length
    const jaccardPct = unionSize > 0 ? Math.round((shared.length / unionSize) * 100) : 0
    return { onlyA, shared, onlyB, jaccardPct }
  }, [groupADetail, groupBDetail])

  const switchTab = (tab: ExplorerTab) => {
    setActiveTab(tab)
    setSelectedId('')
    setSearchParams({ tab, domain })
  }

  return (
    <div className="space-y-6">
      {/* Header + Tabs */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            <Compass className="h-3.5 w-3.5" />
            <span>Threat Intelligence Encyclopedia</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Explorer — Groups, Software, Campaigns &amp; So sánh Giao thoa
          </h1>
        </div>

        {/* Domain Selector */}
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
                setSelectedId('')
                setSearchParams({ tab: activeTab, domain: dom })
              }}
              className={cn(
                'rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                domain === dom
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-300',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Thanh chọn Tab chức năng */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'groups' as const, label: 'Groups (Nhóm tấn công)', icon: Users },
            { id: 'software' as const, label: 'Software (Malware & Tool)', icon: Boxes },
            { id: 'campaigns' as const, label: 'Campaigns (Chiến dịch)', icon: Flag },
            { id: 'compare' as const, label: 'So sánh 2 Group (Venn Overlap)', icon: GitMerge },
          ]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => switchTab(id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-semibold transition-all',
              activeTab === id
                ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 shadow'
                : 'glass-card text-slate-600 dark:text-slate-300 hover:border-cyan-500/40',
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'compare' ? (
        /* Giao diện So sánh 2 Group (Venn Overlap) */
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6 space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-cyan-600 dark:text-cyan-300">
                  Chọn Group A:
                </label>
                <select
                  aria-label="Chọn Group A để so sánh"
                  value={groupAId}
                  onChange={(e) => setGroupAId(e.target.value)}
                  className="w-full rounded-xl border border-cyan-500/40 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {items.map((g) => (
                    <option key={g.attack_id} value={g.attack_id}>
                      {g.attack_id} — {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-violet-600 dark:text-violet-300">
                  Chọn Group B:
                </label>
                <select
                  aria-label="Chọn Group B để so sánh"
                  value={groupBId}
                  onChange={(e) => setGroupBId(e.target.value)}
                  className="w-full rounded-xl border border-violet-500/40 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {items.map((g) => (
                    <option key={g.attack_id} value={g.attack_id}>
                      {g.attack_id} — {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Biểu đồ Venn SVG Trực quan */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950/90 p-6 text-white">
              <svg
                viewBox="0 0 520 220"
                role="img"
                aria-label="Biểu đồ Venn so sánh kỹ thuật dùng chung giữa hai Group"
                className="w-full max-w-xl h-48"
              >
                <circle
                  cx="195"
                  cy="110"
                  r="86"
                  fill="rgba(6, 182, 212, 0.25)"
                  stroke="#22d3ee"
                  strokeWidth="2.5"
                />
                <circle
                  cx="325"
                  cy="110"
                  r="86"
                  fill="rgba(139, 92, 246, 0.25)"
                  stroke="#a78bfa"
                  strokeWidth="2.5"
                />
                <text x="145" y="98" textAnchor="middle" className="fill-cyan-300 text-xs font-bold">
                  {groupADetail?.name ?? groupAId}
                </text>
                <text x="145" y="124" textAnchor="middle" className="fill-white text-2xl font-bold font-mono">
                  {venn.onlyA.length}
                </text>
                <text x="145" y="142" textAnchor="middle" className="fill-slate-400 text-[10px]">
                  Kỹ thuật riêng
                </text>

                <text x="260" y="98" textAnchor="middle" className="fill-emerald-300 text-xs font-bold">
                  Dùng chung
                </text>
                <text x="260" y="124" textAnchor="middle" className="fill-emerald-400 text-2xl font-bold font-mono">
                  {venn.shared.length}
                </text>
                <text x="260" y="142" textAnchor="middle" className="fill-emerald-200 text-[10px]">
                  ({venn.jaccardPct}% Jaccard)
                </text>

                <text x="375" y="98" textAnchor="middle" className="fill-violet-300 text-xs font-bold">
                  {groupBDetail?.name ?? groupBId}
                </text>
                <text x="375" y="124" textAnchor="middle" className="fill-white text-2xl font-bold font-mono">
                  {venn.onlyB.length}
                </text>
                <text x="375" y="142" textAnchor="middle" className="fill-slate-400 text-[10px]">
                  Kỹ thuật riêng
                </text>
              </svg>
            </div>

            {/* 3 Cột Danh sách Kỹ thuật: Riêng A | Giao thoa | Riêng B */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {[
                {
                  title: `Chỉ ${groupADetail?.name ?? groupAId} (${venn.onlyA.length})`,
                  list: venn.onlyA,
                  accent: 'border-cyan-500/35 text-cyan-600 dark:text-cyan-300',
                },
                {
                  title: `Kỹ thuật Giao thoa Chung (${venn.shared.length})`,
                  list: venn.shared,
                  accent: 'border-emerald-500/45 text-emerald-600 dark:text-emerald-300',
                },
                {
                  title: `Chỉ ${groupBDetail?.name ?? groupBId} (${venn.onlyB.length})`,
                  list: venn.onlyB,
                  accent: 'border-violet-500/35 text-violet-600 dark:text-violet-300',
                },
              ].map((col) => (
                <div
                  key={col.title}
                  className={cn(
                    'rounded-2xl border bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-2.5',
                    col.accent,
                  )}
                >
                  <div className="font-display text-sm font-bold">{col.title}</div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {col.list.map((t) => (
                      <button
                        key={t.attack_id}
                        type="button"
                        onClick={() => openTechnique(t.attack_id, domain)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 px-3 py-2 text-left text-xs hover:border-cyan-500/50"
                      >
                        <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400 mr-2">
                          {t.attack_id}
                        </span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">
                          {t.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Giao diện Danh sách + Trang Chi tiết dùng chung cho Groups / Software / Campaigns */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Danh sách bên trái */}
          <aside className="lg:col-span-4 glass-card rounded-3xl p-4 space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Lọc mã, tên hoặc bí danh (vd: OceanLotus)..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="font-mono text-[11px] text-slate-500 px-1">
              Hiển thị {filteredItems.length} / {items.length} mục
            </div>

            {isListLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="h-14 animate-pulse rounded-xl bg-slate-200/60 dark:bg-slate-800/60"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredItems.map((item) => {
                  const active = item.attack_id === selectedId
                  return (
                    <button
                      key={`${item.domain}-${item.attack_id}`}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.attack_id)
                        setSearchParams({ tab: activeTab, id: item.attack_id, domain })
                      }}
                      className={cn(
                        'w-full rounded-xl border p-3 text-left text-xs transition-all space-y-0.5',
                        active
                          ? 'border-cyan-500 bg-cyan-500/15'
                          : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-cyan-500/40',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {item.attack_id}
                        </span>
                        {item.type && (
                          <span className="font-mono text-[10px] uppercase text-slate-400">
                            {item.type}
                          </span>
                        )}
                      </div>
                      <div className="font-display font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </div>
                      {item.data?.aliases && item.data.aliases.length > 1 && (
                        <div className="text-[11px] text-slate-500 truncate">
                          Aliases: {item.data.aliases.join(', ')}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </aside>

          {/* Chi tiết Thực thể bên phải */}
          <div className="lg:col-span-8">
            {isDetailLoading && (
              <div className="h-96 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
            )}

            {detail && (
              <div className="glass-card rounded-3xl p-6 space-y-6">
                <div className="space-y-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-cyan-500/15 border border-cyan-500/35 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan-700 dark:text-cyan-300">
                      {detail.attack_id}
                    </span>
                    <span className="rounded-lg bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-xs uppercase text-slate-600 dark:text-slate-300">
                      {detail.type}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      {detail.technique_count} Techniques ghi nhận
                    </span>
                  </div>

                  <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                    {detail.name}
                  </h2>

                  {detail.metadata?.aliases && detail.metadata.aliases.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {detail.metadata.aliases.map((al) => (
                        <span
                          key={al}
                          className="rounded-md bg-violet-500/10 border border-violet-500/30 px-2 py-0.5 font-mono text-[11px] text-violet-700 dark:text-violet-300"
                        >
                          {al}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mô tả từ MITRE */}
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {detail.description}
                  </ReactMarkdown>
                </div>

                {/* Kỹ thuật nhóm theo từng Tactic */}
                <div className="space-y-3">
                  <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                    Danh sách Kỹ thuật sử dụng theo Tactic ({detail.techniques_by_tactic.length} giai đoạn)
                  </h3>
                  <div className="space-y-3">
                    {detail.techniques_by_tactic.map((stage) => {
                      const tmeta = getTacticMeta(stage.shortname)
                      return (
                        <div
                          key={stage.shortname}
                          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                'rounded-lg border px-2.5 py-0.5 text-xs font-semibold',
                                tmeta.badgeClass,
                              )}
                            >
                              {stage.attack_id} • {stage.name} ({tmeta.viTitle})
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">
                              {stage.techniques.length} kỹ thuật
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {stage.techniques.map((t) => (
                              <button
                                key={`${stage.shortname}-${t.attack_id}`}
                                type="button"
                                onClick={() => openTechnique(t.attack_id, domain)}
                                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-3 text-left text-xs hover:border-cyan-500/50 space-y-1"
                              >
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  <span className="font-mono text-cyan-600 dark:text-cyan-400 mr-1.5">
                                    {t.attack_id}
                                  </span>
                                  {t.name}
                                </div>
                                {t.procedure_description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                    {t.procedure_description}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

