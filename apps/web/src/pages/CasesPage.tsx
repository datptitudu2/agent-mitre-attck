import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Cpu, PlaySquare, ShieldAlert, Sparkles } from 'lucide-react'
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
    <div className="space-y-8 text-bone-100 font-sans">
      {/* Header trang Case Studies — Phong cách Hồ sơ thực địa */}
      <div className="border-b border-line pb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-attack">
            <PlaySquare className="h-3.5 w-3.5" />
            <span>HỒ SƠ TÌNH BÁO CHIẾN DỊCH THỰC TẾ // ATTACK CHAIN STUDIO</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-bone-100">
            Mổ Xẻ Chuỗi Tấn Công Thực Chiến
          </h1>
          <p className="font-sans text-xs sm:text-sm text-bone-300 max-w-3xl leading-relaxed">
            Dữ liệu được đối chiếu trực tiếp từ STIX 2.1 của MITRE (tra cứu động theo tên, không gắn cứng ID),
            kết hợp góc nhìn đối kháng kép <strong>Attacker (▲) ⇄ Defender (❖)</strong> và chuỗi phát hiện chuẩn v18+.
          </p>
        </div>

        <div className="border border-defend/40 bg-defend-muted/15 px-3.5 py-2 font-mono text-xs text-defend shrink-0 rounded-xs">
          ❖ 100% GIÁO DỤC PHÒNG THỦ — KHÔNG CHỨA EXPLOIT/PAYLOAD ĐỘC HẠI
        </div>
      </div>

      {/* Lưới 6 thẻ chọn Case Study (Giữ nguyên bố cục lưới, áp dụng design tokens) */}
      {isListLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 animate-pulse border border-line bg-ink-900 rounded-xs"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {cases.map((item) => {
            const active = item.slug === selectedSlug
            return (
              <button
                key={item.slug}
                type="button"
                onClick={() => handleSelectCase(item.slug)}
                className={cn(
                  'border p-4 text-left transition-colors flex flex-col justify-between gap-3 rounded-xs relative group',
                  active
                    ? 'border-l-2 border-l-attack border-line-strong bg-ink-850 shadow-sm'
                    : 'border-line bg-ink-900 hover:border-line-strong hover:bg-ink-850',
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 font-mono text-[10px]">
                    <span className="inline-flex items-center gap-1 border border-line bg-ink-950 px-2 py-0.5 font-bold uppercase text-bone-300 rounded-xs">
                      {item.domain === 'ics-attack' ? (
                        <>
                          <Cpu className="h-3 w-3 text-caution" />
                          ICS / OT
                        </>
                      ) : item.is_hypothetical ? (
                        <>
                          <Sparkles className="h-3 w-3 text-defend" />
                          AI SCENARIO (v20)
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-3 w-3 text-attack" />
                          {item.entity_attack_id ?? item.source_type.toUpperCase()}
                        </>
                      )}
                    </span>

                    {item.is_hypothetical ? (
                      <span className="text-caution font-semibold">
                        [ GIẢ ĐỊNH ]
                      </span>
                    ) : (
                      <span className="text-bone-500">
                        {item.year_label} · {item.step_count} BƯỚC
                      </span>
                    )}
                  </div>

                  <div className="font-display text-sm font-bold text-bone-100 group-hover:text-white transition-colors line-clamp-1">
                    {item.title}
                  </div>
                  <p className="text-xs text-bone-300 line-clamp-2 leading-relaxed font-sans">
                    {item.summary_vi}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1 font-mono text-[9px] text-bone-500">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className="border border-line/60 bg-ink-950 px-1.5 py-0.5 rounded-xs"
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

      {/* Trình phát Attack Chain Player Đã Thiết Kế Lại Hoàn Toàn */}
      {isDetailLoading && (
        <div className="h-[520px] animate-pulse border border-line bg-ink-900 rounded-xs" />
      )}

      {caseDetail && (
        <div id="case-player-stage" className="space-y-8 pt-2 scroll-mt-28">
          <AttackChainPlayer caseDetail={caseDetail} />

          {/* Khối Biên Tập: Vì sao Case Study này quan trọng */}
          <div className="border-l-2 border-l-line-strong pl-5 py-2 space-y-2 border-t border-line/40 pt-6">
            <div className="font-mono text-xs uppercase tracking-widest text-attack font-bold">
              VÌ SAO CASE STUDY NÀY QUAN TRỌNG // DEFENSIVE VALUE
            </div>
            <p className="font-display font-serif text-lg sm:text-xl text-bone-100 leading-relaxed max-w-4xl">
              &ldquo;{caseDetail.why_it_matters_vi}&rdquo;
            </p>
          </div>
        </div>
      )}

      {/* Footer nhỏ gọn 1 dòng chữ Mono theo chuẩn DESIGN.md */}
      <footer className="border-t border-line pt-4 pb-8 flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-bone-500">
        <div>
          © MITRE ATT&amp;CK® v20.1 (STIX 2.1 Live Data) · ATT&amp;CK Lab Cyber Defense Studio
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://attack.mitre.org/resources/terms-of-use/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-bone-300 underline decoration-line transition-colors"
          >
            Terms of Use ↗
          </a>
          <span>100% Giáo dục Phòng thủ</span>
        </div>
      </footer>
    </div>
  )
}
