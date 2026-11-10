import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Check,
  Copy,
  Layers,
  Plus,
  Server,
  Sliders,
  Sparkles,
  Terminal,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type {
  AnnotatedLogSample,
  TelemetryCollector,
  TelemetryPlanResponse,
} from '@/lib/types'
import { AnnotatedLogReader } from '@/components/telemetry/AnnotatedLogReader'

const DEFAULT_PRESET_SOC = ['sysmon', 'zeek_nsm', 'winevent_security']

export function AgentPlannerPage() {
  const [selectedCollectors, setSelectedCollectors] = useState<string[]>(DEFAULT_PRESET_SOC)
  const [copiedBlueprint, setCopiedBlueprint] = useState(false)

  // 1. Tải danh sách Collectors
  const { data: collectorsData } = useQuery({
    queryKey: ['telemetry-collectors'],
    queryFn: () => apiFetch<{ collectors: TelemetryCollector[] }>('/api/telemetry/collectors'),
  })

  // 2. Tải bản tính Plan theo Collectors được chọn
  const { data: planData } = useQuery({
    queryKey: ['telemetry-plan', selectedCollectors],
    queryFn: () =>
      apiFetch<TelemetryPlanResponse>('/api/telemetry/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected_collector_ids: selectedCollectors }),
      }),
  })

  // 3. Tải danh sách Annotated Logs mẫu
  const { data: logsData } = useQuery({
    queryKey: ['telemetry-annotated-logs'],
    queryFn: () => apiFetch<{ logs: AnnotatedLogSample[] }>('/api/telemetry/annotated-logs'),
  })

  const collectors = collectorsData?.collectors || []
  const plan = planData
  const sampleLogs = logsData?.logs || []

  const toggleCollector = (id: string) => {
    setSelectedCollectors((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    )
  }

  const applyPreset = (preset: string[]) => {
    setSelectedCollectors(preset)
  }

  const copyBlueprintMarkdown = async () => {
    if (!plan) return
    const md = [
      `# BẢN THIẾT KẾ THU THẬP TELEMETRY (ATT&CK LAB BLUEPRINT)`,
      `Ngày tạo: ${new Date().toISOString()}`,
      `Nguồn thu thập kích hoạt: ${selectedCollectors.join(', ')}`,
      `Độ phủ tổng thể: ${plan.coverage_percentage}% (${plan.covered_techniques_count}/${plan.total_techniques_count} Enterprise Techniques)`,
      ``,
      `## Độ phủ theo Tactic`,
      ...Object.entries(plan.tactics_coverage).map(
        ([t, stat]) => `- ${t}: ${stat.covered}/${stat.total} (${stat.percentage}%)`,
      ),
      ``,
      `## Khuyến nghị bổ sung tối ưu (Greedy)`,
      ...plan.greedy_recommendations.slice(0, 3).map(
        (g) => `- ${g.collector_name}: +${g.additional_techniques} kỹ thuật (+${g.marginal_gain_pct}%)`,
      ),
    ].join('\n')

    try {
      await navigator.clipboard.writeText(md)
      setCopiedBlueprint(true)
      setTimeout(() => setCopiedBlueprint(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="border-b border-bone-300/80 dark:border-bone-800 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 font-mono text-xs text-signal-amber uppercase tracking-wider font-semibold">
              <Sliders className="h-4 w-4" />
              <span>Telemetry Engineering Studio // ATT&CK v20+</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-bone-950 dark:text-bone-50 tracking-tight">
              Agent Telemetry Planner
            </h1>
            <p className="mt-1 text-sm text-bone-600 dark:text-bone-400 font-sans max-w-3xl">
              Khảo sát độ phủ dữ liệu giám sát an ninh & tối ưu hóa nguồn thu thập theo nguyên lý{' '}
              <strong className="text-bone-900 dark:text-bone-200 font-mono">
                Greedy Marginal Gain
              </strong>
              . Trả lời chính xác: Cần cài đặt nguồn thu thập nào tiếp theo để phát hiện nhiều kỹ thuật nhất?
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void copyBlueprintMarkdown()}
              disabled={!plan}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-bone-300 dark:border-bone-700 bg-bone-100 dark:bg-bone-900 text-bone-800 dark:text-bone-200 text-xs font-mono font-medium hover:bg-bone-200 dark:hover:bg-bone-800 transition-colors shadow-sm disabled:opacity-50"
            >
              {copiedBlueprint ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-signal-amber" />
              )}
              <span>{copiedBlueprint ? 'Đã sao chép' : 'Xuất Blueprint'}</span>
            </button>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-bone-500 font-medium">Bộ mẫu gợi ý:</span>
          <button
            type="button"
            onClick={() => applyPreset(['sysmon', 'zeek_nsm', 'winevent_security'])}
            className="px-2.5 py-1 rounded-lg border border-bone-300 dark:border-bone-800 bg-bone-200/50 dark:bg-bone-900/40 text-bone-700 dark:text-bone-300 hover:border-signal-amber transition-colors"
          >
            SOC Tiêu chuẩn (Sysmon + Zeek + WinSec)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(['linux_auditd', 'linux_ebpf', 'zeek_nsm'])}
            className="px-2.5 py-1 rounded-lg border border-bone-300 dark:border-bone-800 bg-bone-200/50 dark:bg-bone-900/40 text-bone-700 dark:text-bone-300 hover:border-signal-amber transition-colors"
          >
            Linux Cloud & Container (Auditd + eBPF + Zeek)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(['aws_cloudtrail', 'azure_activity'])}
            className="px-2.5 py-1 rounded-lg border border-bone-300 dark:border-bone-800 bg-bone-200/50 dark:bg-bone-900/40 text-bone-700 dark:text-bone-300 hover:border-signal-amber transition-colors"
          >
            Đám mây thuần túy (AWS + Azure)
          </button>
          <button
            type="button"
            onClick={() => setSelectedCollectors([])}
            className="px-2.5 py-1 rounded-lg text-bone-500 hover:text-bone-800 dark:hover:text-bone-200 transition-colors"
          >
            Xoá bộ chọn
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Collector Checklist, Right = Analytics & Greedy */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Collector Checklist */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-bone-700 dark:text-bone-300 flex items-center gap-1.5">
              <Server className="h-4 w-4 text-signal-amber" />
              <span>Nguồn Thu Thập ({selectedCollectors.length}/{collectors.length})</span>
            </h2>
            <span className="text-xs font-mono text-bone-500">
              Chọn nguồn telemetry thực tế
            </span>
          </div>

          <div className="space-y-2.5">
            {collectors.map((col) => {
              const isSelected = selectedCollectors.includes(col.id)

              return (
                <div
                  key={col.id}
                  onClick={() => toggleCollector(col.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-signal-amber/60 bg-signal-amber/5 dark:bg-signal-amber/10 shadow-sm'
                      : 'border-bone-300/80 dark:border-bone-800 bg-bone-100/40 dark:bg-bone-900/20 hover:border-bone-400 dark:hover:border-bone-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="mt-1 h-4 w-4 rounded border-bone-400 text-signal-amber focus:ring-signal-amber/30"
                    />

                    <div className="grow space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-sans font-semibold text-sm text-bone-900 dark:text-bone-100">
                          {col.name}
                        </span>
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <span className="px-1.5 py-0.5 rounded uppercase font-bold bg-bone-200 dark:bg-bone-800 text-bone-700 dark:text-bone-300">
                            {col.os}
                          </span>
                          {col.is_agentless && (
                            <span className="px-1.5 py-0.5 rounded font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              Agentless
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-bone-600 dark:text-bone-400 leading-relaxed font-sans line-clamp-2">
                        {col.description}
                      </p>

                      <div className="pt-1 flex items-center justify-between font-mono text-[11px] text-bone-500">
                        <span>{col.events_count} sự kiện chuẩn hóa</span>
                        <span className="font-semibold text-bone-700 dark:text-bone-300">
                          Phủ {col.techniques_covered_count} kỹ thuật
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Column: Blueprint Analytics & Greedy Recommendations */}
        <div className="lg:col-span-7 space-y-6">
          {/* KPI Card */}
          <div className="rounded-2xl border border-bone-300 dark:border-bone-800 bg-bone-100/60 dark:bg-bone-950/80 p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-bone-500 font-semibold">
                  Tỷ lệ bao phủ MITRE ATT&CK Enterprise
                </span>
                <div className="mt-1 flex items-baseline gap-3">
                  <span className="font-mono text-4xl sm:text-5xl font-bold text-bone-900 dark:text-bone-100 tracking-tight">
                    {plan?.coverage_percentage ?? 0}%
                  </span>
                  <span className="font-mono text-sm text-bone-600 dark:text-bone-400">
                    ({plan?.covered_techniques_count ?? 0} / {plan?.total_techniques_count ?? 0} Kỹ thuật)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-1 rounded-lg bg-signal-amber/15 text-signal-amber font-semibold border border-signal-amber/30">
                  {selectedCollectors.length} nguồn telemetry
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 rounded-full bg-bone-200 dark:bg-bone-800 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${plan?.coverage_percentage ?? 0}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-signal-amber rounded-full"
              />
            </div>
          </div>

          {/* Greedy Recommendation Box */}
          {plan && plan.greedy_recommendations.length > 0 && (
            <div className="rounded-2xl border border-signal-amber/40 bg-signal-amber/5 dark:bg-signal-amber/10 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-signal-amber font-bold">
                  <Sparkles className="h-4 w-4" />
                  <span>Khuyến nghị tối ưu tiếp theo (Greedy Marginal Gain)</span>
                </div>
                <span className="font-mono text-[11px] text-bone-500">
                  Thuật toán chọn lọc tham lam
                </span>
              </div>

              <p className="text-xs text-bone-700 dark:text-bone-300 font-sans leading-relaxed">
                Để tăng tối đa độ phủ mà không lãng phí tài nguyên thu thập, nguồn dữ liệu mang lại giá trị gia tăng lớn nhất tiếp theo là:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {plan.greedy_recommendations.slice(0, 2).map((rec) => (
                  <div
                    key={rec.collector_id}
                    className="p-3.5 rounded-xl border border-signal-amber/30 bg-bone-50/60 dark:bg-bone-900/60 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-sans font-semibold text-sm text-bone-900 dark:text-bone-100">
                          {rec.collector_name}
                        </span>
                        <span className="font-mono text-xs font-bold text-signal-amber">
                          +{rec.marginal_gain_pct}%
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-bone-600 dark:text-bone-400">
                        Bổ sung thêm <strong>+{rec.additional_techniques}</strong> kỹ thuật
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {rec.key_unlocked_capabilities.map((cap) => (
                          <span
                            key={cap}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-bone-200/70 dark:bg-bone-800/70 text-bone-700 dark:text-bone-300"
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleCollector(rec.collector_id)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-signal-amber text-black font-mono text-xs font-semibold hover:brightness-110 transition-all shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Kích hoạt nguồn này</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tactics Coverage Matrix */}
          <div className="rounded-2xl border border-bone-300 dark:border-bone-800 bg-bone-100/40 dark:bg-bone-950/60 p-5 space-y-3">
            <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-bone-700 dark:text-bone-300 font-bold">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-signal-amber" />
                <span>Độ Phủ Theo 15 Tactics Chiến Lược</span>
              </span>
              <span className="text-[11px] text-bone-500 font-normal">
                {Object.keys(plan?.tactics_coverage || {}).length} Tactics
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 font-mono text-xs">
              {Object.entries(plan?.tactics_coverage || {}).map(([tactic, stat]) => (
                <div
                  key={tactic}
                  className="p-2.5 rounded-lg border border-bone-200 dark:border-bone-800/80 bg-bone-50/50 dark:bg-bone-900/30 flex items-center justify-between"
                >
                  <div className="truncate mr-2 font-sans font-medium text-bone-800 dark:text-bone-200 text-xs">
                    {tactic}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] text-bone-500">
                      {stat.covered}/{stat.total}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        stat.percentage >= 70
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : stat.percentage >= 40
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {stat.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Annotated Log Reader Showcase */}
      <div className="pt-6 border-t border-bone-300/80 dark:border-bone-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-signal-amber font-semibold">
              <Terminal className="h-4 w-4" />
              <span>Thực Chiến // Annotated Log Reader</span>
            </div>
            <h2 className="font-serif text-2xl font-normal text-bone-950 dark:text-bone-50 tracking-tight mt-0.5">
              Phân Tích Dấu Vết Thực Tế Từng Dòng Nhật Ký
            </h2>
          </div>
          <p className="text-xs text-bone-500 font-mono">
            Di chuột vào từng trường dữ liệu để đọc chú giải kỹ thuật của chuyên gia SOC
          </p>
        </div>

        <div className="space-y-4">
          {sampleLogs.map((log) => (
            <AnnotatedLogReader key={log.id} sample={log} />
          ))}
        </div>
      </div>
    </div>
  )
}
