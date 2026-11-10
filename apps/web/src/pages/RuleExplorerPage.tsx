import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileCode2,
  Search,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { SigmaRule } from '@/lib/types'
import { SigmaRuleViewer } from '@/components/detection/SigmaRuleViewer'

export function RuleExplorerPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null)

  // 1. Tải danh sách luật Sigma
  const { data: rulesData, isLoading: loadingRules } = useQuery({
    queryKey: ['sigma-rules', selectedLevel, searchTerm],
    queryFn: () => {
      const params = new URLSearchParams()
      if (selectedLevel !== 'all') params.set('level', selectedLevel)
      if (searchTerm.trim()) params.set('search', searchTerm.trim())
      const qs = params.toString() ? `?${params.toString()}` : ''
      return apiFetch<{ rules: SigmaRule[]; total: number }>(`/api/detection/sigma-rules${qs}`)
    },
  })

  const rules = rulesData?.rules || []
  const activeRule = rules.find((r) => r.id === activeRuleId) || rules[0]

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="border-b border-bone-300/80 dark:border-bone-800 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 font-mono text-xs text-signal-amber uppercase tracking-wider font-semibold">
              <FileCode2 className="h-4 w-4" />
              <span>Detection Engineering // SigmaHQ Library</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-bone-950 dark:text-bone-50 tracking-tight">
              Rule Explorer &amp; Detection Workbench
            </h1>
            <p className="mt-1 text-sm text-bone-600 dark:text-bone-400 font-sans max-w-3xl">
              Trình duyệt luật phát hiện an ninh chuẩn mở{' '}
              <strong className="text-bone-900 dark:text-bone-200 font-mono">SigmaHQ</strong>. Phân
              tích cây điều kiện phát hiện (Detection Tree), đối soát rủi ro True Positive vs False
              Positive và kiểm thử trực tiếp trên trình duyệt.
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[240px] grow sm:grow-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-bone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên luật, MITRE ID (vd: T1059)..."
              className="w-full sm:w-80 rounded-lg border border-bone-300 dark:border-bone-800 bg-bone-100/60 dark:bg-bone-900/40 pl-9 pr-3 py-1.5 text-xs text-bone-900 dark:text-bone-100 placeholder:text-bone-400 focus:outline-none focus:border-signal-amber"
            />
          </div>

          {/* Level Filter Buttons */}
          <div className="inline-flex rounded-lg border border-bone-300 dark:border-bone-800 p-0.5 bg-bone-200/50 dark:bg-bone-900/50 font-mono text-xs">
            {['all', 'critical', 'high', 'medium'].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setSelectedLevel(lvl)}
                className={`px-3 py-1 rounded capitalize font-medium transition-colors ${
                  selectedLevel === lvl
                    ? 'bg-signal-amber text-black font-semibold'
                    : 'text-bone-600 dark:text-bone-400 hover:text-bone-900 dark:hover:text-bone-200'
                }`}
              >
                {lvl === 'all' ? 'Tất cả Mức độ' : lvl}
              </button>
            ))}
          </div>

          <span className="font-mono text-xs text-bone-500 ml-auto">
            Hiển thị {rules.length} luật phát hiện
          </span>
        </div>
      </div>

      {/* Main Split Layout: Left = Rule List, Right = Rule Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
          {loadingRules && (
            <div className="p-6 text-center font-mono text-xs text-bone-500 animate-pulse border border-bone-300/60 dark:border-bone-800 rounded-xl">
              Đang truy vấn thư viện SigmaHQ...
            </div>
          )}
          {rules.map((rule) => {
            const isSelected = activeRule?.id === rule.id
            const levelBadge = {
              critical: 'text-rose-500 bg-rose-500/10 border-rose-500/30',
              high: 'text-signal-amber bg-signal-amber/10 border-signal-amber/30',
              medium: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
              low: 'text-bone-400 bg-bone-400/10 border-bone-400/30',
            }[rule.level]

            return (
              <div
                key={rule.id}
                onClick={() => setActiveRuleId(rule.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'border-signal-amber bg-signal-amber/5 dark:bg-signal-amber/10 shadow-sm'
                    : 'border-bone-300/80 dark:border-bone-800 bg-bone-100/40 dark:bg-bone-900/20 hover:border-bone-400 dark:hover:border-bone-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded-xs font-mono text-[10px] font-bold uppercase tracking-wider border ${levelBadge}`}
                  >
                    {rule.level}
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-bone-500">
                    {rule.techniques.map((t) => (
                      <span key={t} className="font-semibold text-signal-amber">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="font-sans font-semibold text-sm text-bone-900 dark:text-bone-100 leading-snug">
                  {rule.title}
                </div>

                <p className="text-xs text-bone-600 dark:text-bone-400 font-sans line-clamp-2">
                  {rule.description}
                </p>

                <div className="pt-1 flex items-center justify-between font-mono text-[11px] text-bone-500 border-t border-bone-200/60 dark:border-bone-800/60">
                  <span>
                    {rule.logsource.product} // {rule.logsource.category}
                  </span>
                  <span>{rule.author.split(',')[0]}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Inspection */}
        <div className="lg:col-span-7">
          {activeRule ? (
            <SigmaRuleViewer rule={activeRule} />
          ) : (
            <div className="p-12 text-center font-mono text-xs text-bone-500 border border-dashed border-bone-300 dark:border-bone-800 rounded-xl">
              Không có luật nào khớp với bộ lọc.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
