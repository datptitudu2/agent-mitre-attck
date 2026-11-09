import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  AlertTriangle,
  Bookmark,
  Check,
  ChevronRight,
  Cpu,
  Database,
  ExternalLink,
  FileText,
  Layers,
  Radar,
  ShieldCheck,
  Sliders,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { getTacticMeta } from '@/lib/tacticTheme'
import type { TechniqueDetail } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useBookmarks, useTechniqueNote } from '@/hooks/useUserData'
import { useUiStore } from '@/stores/useUiStore'

type TabKey = 'overview' | 'detection' | 'procedures' | 'notes'

export function TechniqueSlideOver() {
  const { selectedTechnique, openTechnique, closeTechnique } = useUiStore()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSavedToast, setNoteSavedToast] = useState(false)

  const attackId = selectedTechnique?.attackId ?? null
  const domainHint = selectedTechnique?.domain

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['technique-detail', attackId, domainHint],
    enabled: Boolean(attackId),
    queryFn: () =>
      apiFetch<TechniqueDetail>(
        `/api/techniques/${encodeURIComponent(attackId!)}${
          domainHint ? `?domain=${encodeURIComponent(domainHint)}` : ''
        }`,
      ),
  })

  const { bookmarks, toggleBookmark } = useBookmarks()
  const { note, saveNote } = useTechniqueNote(attackId)

  useEffect(() => {
    setNoteDraft(note?.body_md ?? '')
  }, [note?.body_md, attackId])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedTechnique) {
        closeTechnique()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedTechnique, closeTechnique])

  const existingBookmark = detail
    ? bookmarks.find(
        (b) => b.attack_id === detail.attack_id && b.domain === detail.domain,
      )
    : undefined

  const handleSaveNote = async () => {
    await saveNote.mutateAsync(noteDraft)
    setNoteSavedToast(true)
    setTimeout(() => setNoteSavedToast(false), 2000)
  }

  return (
    <AnimatePresence>
      {selectedTechnique && (
        <>
          <motion.div
            key="tech-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            onClick={closeTechnique}
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm"
          />

          <motion.aside
            key="tech-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Chi tiết kỹ thuật ${selectedTechnique.attackId}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%', transition: { duration: 0.14 } }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-cyber-surface shadow-2xl"
          >
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                      {detail?.attack_id ?? selectedTechnique.attackId}
                    </span>
                    {detail?.domain && (
                      <span className="rounded-lg bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {detail.domain}
                      </span>
                    )}
                    {detail?.is_new && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                        <Sparkles className="h-3 w-3" />
                        NEW (v20)
                      </span>
                    )}
                    {detail?.parent && (
                      <button
                        type="button"
                        onClick={() => openTechnique(detail.parent!.attack_id, detail.domain)}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-500/10 border border-violet-500/30 px-2 py-0.5 text-[11px] text-violet-700 dark:text-violet-300 hover:bg-violet-500/20"
                      >
                        <span>Thuộc {detail.parent.attack_id}</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    {detail?.name ?? 'Đang tải thông tin kỹ thuật...'}
                  </h2>

                  {detail && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {detail.tactics.map((tac) => {
                        const meta = getTacticMeta(tac)
                        return (
                          <span
                            key={tac}
                            title={meta.viHint}
                            className={cn(
                              'rounded-md border px-2 py-0.5 text-[11px] font-medium',
                              meta.badgeClass,
                            )}
                          >
                            {tac} • {meta.viTitle}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {detail && (
                    <button
                      type="button"
                      onClick={() =>
                        toggleBookmark.mutate({
                          attackId: detail.attack_id,
                          domain: detail.domain,
                          existingId: existingBookmark?.id,
                        })
                      }
                      aria-label="Đánh dấu Bookmark kỹ thuật này"
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                        existingBookmark
                          ? 'border-amber-500/50 bg-amber-500/15 text-amber-600 dark:text-amber-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                      )}
                    >
                      <Bookmark
                        className={cn('h-4 w-4', existingBookmark && 'fill-current')}
                      />
                      <span>{existingBookmark ? 'Đã lưu' : 'Bookmark'}</span>
                    </button>
                  )}

                  {detail?.metadata?.url && (
                    <a
                      href={detail.metadata.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Xem trang gốc trên MITRE ATT&CK"
                      className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={closeTechnique}
                    aria-label="Đóng bảng chi tiết"
                    className="rounded-xl border border-slate-200 dark:border-slate-700 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Thanh chuyển Tab */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {[
                  {
                    id: 'overview' as const,
                    label: 'Tổng quan & Diễn giải',
                    icon: Layers,
                  },
                  {
                    id: 'detection' as const,
                    label: `Detection → Analytic (${detail?.detection_strategies.length ?? 0})`,
                    icon: Radar,
                  },
                  {
                    id: 'procedures' as const,
                    label: `Thực tế & Giảm thiểu (${
                      (detail?.procedures.groups.length ?? 0) +
                      (detail?.procedures.software.length ?? 0) +
                      (detail?.mitigations.length ?? 0)
                    })`,
                    icon: ShieldCheck,
                  },
                  {
                    id: 'notes' as const,
                    label: 'Ghi chú cá nhân',
                    icon: FileText,
                  },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors',
                      activeTab === id
                        ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {isLoading && (
                <div className="space-y-3">
                  <div className="h-24 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
                  <div className="h-40 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70" />
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
                  {error instanceof Error ? error.message : 'Không tải được chi tiết kỹ thuật.'}
                </div>
              )}

              {detail && (detail.revoked || detail.deprecated) && (
                <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-semibold text-sm mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span>
                      Technique này đã ngừng sử dụng ({detail.revoked ? 'Revoked' : 'Deprecated'})
                    </span>
                  </div>
                  <p>
                    MITRE không còn duy trì kỹ thuật này trong ma trận hiện hành.
                    {detail.replaced_by && (
                      <>
                        {' '}
                        Đã được thay thế bởi:{' '}
                        <button
                          type="button"
                          onClick={() =>
                            openTechnique(
                              detail.replaced_by!.attack_id,
                              detail.domain,
                            )
                          }
                          className="ml-1 inline-flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-0.5 font-mono font-semibold underline"
                        >
                          {detail.replaced_by.attack_id} — {detail.replaced_by.name}
                        </button>
                      </>
                    )}
                  </p>
                </div>
              )}

              {detail && activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Diễn giải tiếng Việt của Lab — tách biệt rõ với mô tả gốc MITRE */}
                  <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        Diễn giải nhanh của ATT&amp;CK Lab (Tiếng Việt)
                      </span>
                      <span className="rounded bg-cyan-500/15 px-2 py-0.5 font-mono text-[10px] text-cyan-700 dark:text-cyan-300">
                        Góc nhìn Phòng thủ
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                      <strong>{detail.name}</strong> ({detail.attack_id}) là{' '}
                      {detail.is_subtechnique ? 'một kỹ thuật nhánh (Sub-technique)' : 'một kỹ thuật (Technique)'}{' '}
                      thuộc giai đoạn{' '}
                      <strong>
                        {detail.tactics
                          .map((t) => `${getTacticMeta(t).viTitle} (${t})`)
                          .join(', ')}
                      </strong>
                      . Trong dữ liệu thực tế hiện hành, kỹ thuật này được ghi nhận ở{' '}
                      <strong>{detail.usage_count}</strong> nhóm tấn công / phần mềm độc hại / chiến dịch và có{' '}
                      <strong>{detail.detection_strategies.length}</strong> chiến lược phát hiện (Detection Strategy) chính thức.
                    </p>
                    {detail.platforms.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Nền tảng áp dụng:
                        </span>
                        {detail.platforms.map((pf) => (
                          <span
                            key={pf}
                            className="rounded-md bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-700 dark:text-slate-200"
                          >
                            {pf}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Mô tả gốc chuẩn MITRE */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        Mô tả gốc từ MITRE ATT&amp;CK
                      </h3>
                      <span className="font-mono text-[10px] uppercase text-slate-400">
                        Nguyên bản STIX 2.1
                      </span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 text-xs leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {detail.description}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Danh sách Sub-techniques nếu là Technique cha */}
                  {detail.subtechniques.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        Các Sub-technique chi tiết ({detail.subtechniques.length})
                      </h3>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {detail.subtechniques.map((sub) => (
                          <button
                            key={sub.attack_id}
                            type="button"
                            onClick={() => openTechnique(sub.attack_id, detail.domain)}
                            className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-2.5 text-left hover:border-cyan-500/50 transition-colors"
                          >
                            <div>
                              <div className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                                {sub.attack_id}
                              </div>
                              <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                {sub.name}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {detail && activeTab === 'detection' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-3.5 text-xs text-slate-700 dark:text-slate-300">
                    <strong>Mô hình phát hiện mới từ ATT&amp;CK v18+:</strong>{' '}
                    <code className="font-mono text-violet-600 dark:text-violet-300">
                      Detection Strategy (DET)
                    </code>{' '}
                    định nghĩa hướng phát hiện độc lập nhà cung cấp → triển khai thành các{' '}
                    <code className="font-mono text-cyan-600 dark:text-cyan-300">
                      Analytic (AN)
                    </code>{' '}
                    theo từng hệ điều hành → gắn trực tiếp vào nguồn log{' '}
                    <code className="font-mono text-emerald-600 dark:text-emerald-300">
                      Data Component (DC)
                    </code>
                    .
                  </div>

                  {detail.detection_strategies.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-6 text-center text-xs text-slate-500">
                      Chưa có Detection Strategy riêng cho kỹ thuật này trong gói dữ liệu hiện tại.
                    </div>
                  ) : (
                    detail.detection_strategies.map((det) => (
                      <div
                        key={det.attack_id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="rounded bg-violet-500/15 border border-violet-500/30 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700 dark:text-violet-300">
                              {det.attack_id}
                            </span>
                            <h4 className="mt-1 font-display text-sm font-bold text-slate-900 dark:text-white">
                              {det.name}
                            </h4>
                          </div>
                          {det.url && (
                            <a
                              href={det.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-cyan-500 hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <span>MITRE</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        <div className="space-y-3 pl-2 border-l-2 border-violet-500/30">
                          {det.analytics.map((an) => (
                            <div
                              key={an.attack_id}
                              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-3.5 space-y-2.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-cyan-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                                    {an.attack_id}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                    {an.name}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {an.platforms.map((p) => (
                                    <span
                                      key={p}
                                      className="inline-flex items-center gap-1 rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:text-slate-300"
                                    >
                                      <Cpu className="h-2.5 w-2.5" />
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                                {an.description}
                              </p>

                              {/* Data Components & Log Sources */}
                              {an.log_sources.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                    <Database className="h-3 w-3" />
                                    <span>Data Components &amp; Kênh Log cần thu thập:</span>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1.5">
                                    {an.log_sources.map((ls, idx) => (
                                      <div
                                        key={`${ls.name}-${ls.channel}-${idx}`}
                                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-2.5 py-1.5 text-[11px]"
                                      >
                                        <div className="font-medium text-slate-800 dark:text-slate-200">
                                          {ls.data_component ? (
                                            <>
                                              <span className="font-mono text-emerald-600 dark:text-emerald-400 mr-1.5">
                                                [{ls.data_component.attack_id}]
                                              </span>
                                              {ls.data_component.name}
                                            </>
                                          ) : (
                                            'Telemetry Channel'
                                          )}
                                        </div>
                                        <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                          {ls.name} {ls.channel ? `• ${ls.channel}` : ''}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Mutable Elements (Tham số tinh chỉnh SIEM/EDR) */}
                              {an.mutable_elements.length > 0 && (
                                <div className="space-y-1 pt-1">
                                  <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                                    <Sliders className="h-3 w-3" />
                                    <span>Tham số cần tinh chỉnh theo môi trường (Mutable Elements):</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {an.mutable_elements.map((me) => (
                                      <span
                                        key={me.field}
                                        title={me.description}
                                        className="rounded bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 font-mono text-[10px] text-amber-800 dark:text-amber-200"
                                      >
                                        {me.field}: {me.description}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {detail && activeTab === 'procedures' && (
                <div className="space-y-5">
                  {/* Mitigations */}
                  <section className="space-y-2">
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span>Cách giảm thiểu — Mitigations ({detail.mitigations.length})</span>
                    </h3>
                    {detail.mitigations.length === 0 ? (
                      <p className="text-xs text-slate-500">Không có Mitigation trực tiếp.</p>
                    ) : (
                      <div className="space-y-2">
                        {detail.mitigations.map((m) => (
                          <div
                            key={m.attack_id}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-xs space-y-1"
                          >
                            <div className="font-semibold text-slate-900 dark:text-white">
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 mr-2">
                                {m.attack_id}
                              </span>
                              {m.name}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {m.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* ICS Assets nếu thuộc ma trận ICS */}
                  {detail.ics_assets.length > 0 && (
                    <section className="space-y-2">
                      <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white">
                        Thiết bị công nghiệp chịu ảnh hưởng — ICS Assets ({detail.ics_assets.length})
                      </h3>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {detail.ics_assets.map((asset) => (
                          <div
                            key={asset.attack_id}
                            className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs"
                          >
                            <div className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                              {asset.attack_id} — {asset.name}
                            </div>
                            <p className="mt-1 text-slate-600 dark:text-slate-300 line-clamp-3">
                              {asset.rel_description || asset.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Procedure Examples */}
                  <section className="space-y-2">
                    <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Users className="h-4 w-4 text-rose-500" />
                      <span>
                        Ví dụ thực tế — Procedure Examples (
                        {detail.procedures.groups.length} Groups, {detail.procedures.software.length}{' '}
                        Software, {detail.procedures.campaigns.length} Campaigns)
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {[
                        ...detail.procedures.campaigns,
                        ...detail.procedures.groups,
                        ...detail.procedures.software,
                      ]
                        .slice(0, 25)
                        .map((proc) => (
                          <div
                            key={`${proc.type}-${proc.attack_id}`}
                            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                <span className="font-mono text-cyan-600 dark:text-cyan-400 mr-1.5">
                                  {proc.attack_id}
                                </span>
                                {proc.name}
                              </span>
                              <span className="rounded bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] uppercase text-slate-500">
                                {proc.type}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {proc.description}
                            </p>
                          </div>
                        ))}
                    </div>
                  </section>
                </div>
              )}

              {detail && activeTab === 'notes' && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 text-xs text-slate-600 dark:text-slate-300">
                    Ghi chú này được bảo vệ bởi <strong>Supabase Row Level Security (RLS)</strong> — chỉ
                    tài khoản của riêng bạn mới đọc và chỉnh sửa được. Hỗ trợ cú pháp Markdown.
                  </div>

                  <textarea
                    rows={10}
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder={`Ghi chú phòng thủ của bạn cho ${detail.attack_id} (${detail.name})...\nVí dụ: Quy tắc SIEM nội bộ, nguồn log Sysmon đã bật, hoặc kịch bản Threat Hunting cần kiểm tra.`}
                    className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-4 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-500 inline-flex items-center gap-1">
                      {noteSavedToast && (
                        <>
                          <Check className="h-4 w-4" />
                          Đã lưu ghi chú riêng tư thành công!
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={saveNote.isPending}
                      onClick={() => void handleSaveNote()}
                      className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white hover:from-cyan-400 hover:to-violet-500 disabled:opacity-60"
                    >
                      {saveNote.isPending ? 'Đang lưu...' : 'Lưu ghi chú'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
