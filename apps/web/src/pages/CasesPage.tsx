import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Cpu, Layers, PlaySquare, ShieldAlert, Sparkles } from 'lucide-react'
import { AttackChainPlayer } from '@/components/cases/AttackChainPlayer'
import { apiFetch } from '@/lib/api'
import type { CaseStudyDetail, CaseStudySummary } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CasesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const slugParam = searchParams.get('case')

  const { data: listData, isLoading: isListLoading } = useQuery({
    queryKey: ['cases-list'],
    queryFn: () => apiFetch<{ count: number; items: CaseStudySummary[] }>('/api/cases'),
  })

  const cases = listData?.items ?? []
  const [selectedSlug, setSelectedSlug] = useState<string>('')

  useEffect(() => {
    if (slugParam) {
      setSelectedSlug(slugParam)
    } else if (!selectedSlug && cases.length > 0) {
      setSelectedSlug(cases[0].slug)
    }
  }, [slugParam, cases, selectedSlug])

  const { data: caseDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['case-detail', selectedSlug],
    enabled: Boolean(selectedSlug),
    queryFn: () => apiFetch<CaseStudyDetail>(`/api/cases/${encodeURIComponent(selectedSlug)}`),
  })

  const handleSelectCase = (slug: string) => {
    setSelectedSlug(slug)
    setSearchParams({ case: slug })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-violet-500 dark:text-violet-400">
            <PlaySquare className="h-3.5 w-3.5" />
            <span>Interactive Attack Chain Studio</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Case Studies — Xem một Cuộc tấn công Thật diễn ra thế nào
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-3xl">
            Từng bước được dựng tự động từ dữ liệu STIX 2.1 chính thức của MITRE (tra cứu động theo tên, không gắn cứng ID),
            kết hợp diễn giải đời thường tiếng Việt và công tắc lật góc nhìn{' '}
            <strong>Attacker ⇄ Defender</strong>.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium shrink-0">
          100% Giáo dục Phòng thủ — Không chứa mã khai thác hay lệnh tấn công thực thi
        </div>
      </div>

      {/* Bộ chọn Case Study (6 thẻ ngang trực quan) */}
      {isListLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800/70"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cases.map((item) => {
            const active = item.slug === selectedSlug
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => handleSelectCase(item.slug)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all flex flex-col justify-between gap-2.5',
                  active
                    ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                    : 'glass-card hover:border-cyan-500/40',
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 dark:bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-semibold text-cyan-700 dark:text-cyan-300">
                      {item.domain === 'ics-attack' ? (
                        <>
                          <Cpu className="h-3 w-3 text-amber-400" />
                          ICS / OT
                        </>
                      ) : item.is_hypothetical ? (
                        <>
                          <Sparkles className="h-3 w-3 text-emerald-400" />
                          AI Scenario (v20)
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-3 w-3 text-rose-400" />
                          {item.entity_attack_id ?? item.source_type}
                        </>
                      )}
                    </span>

                    {item.is_hypothetical ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/40 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Giả định học tập
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        {item.year_label} • {item.step_count} bước
                      </span>
                    )}
                  </div>

                  <div className="font-display text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {item.title}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                    {item.summary_vi}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-slate-200/70 dark:bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Trình phát Attack Chain Player */}
      {isDetailLoading && (
        <div className="h-[520px] animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
      )}

      {caseDetail && (
        <div className="space-y-4">
          <AttackChainPlayer caseDetail={caseDetail} />

          {/* Bài học rút ra cho đội ngũ phòng thủ */}
          <div className="glass-card rounded-2xl p-5 flex items-start gap-3">
            <Layers className="h-5 w-5 text-cyan-500 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs leading-relaxed">
              <div className="font-display text-sm font-bold text-slate-900 dark:text-white">
                Tại sao Case Study này quan trọng với đội bảo mật?
              </div>
              <p className="text-slate-600 dark:text-slate-300">{caseDetail.why_it_matters_vi}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
