import { useQuery } from '@tanstack/react-query'
import { Columns } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { OsTelemetryRow } from '@/lib/types'

export function TelemetryComparisonTable() {
  const { data } = useQuery({
    queryKey: ['os-telemetry-matrix'],
    queryFn: () => apiFetch<{ matrix: OsTelemetryRow[] }>('/api/detection/os-telemetry'),
  })

  const rows = data?.matrix || []

  return (
    <div className="rounded-2xl border border-bone-300 dark:border-bone-800 bg-bone-100/50 dark:bg-bone-950/70 overflow-hidden shadow-sm space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-bone-200 dark:border-bone-800 pb-3">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-signal-amber font-semibold">
            <Columns className="h-4 w-4" />
            <span>Telemetry Cross-Check // Windows ⇄ Linux</span>
          </div>
          <h3 className="font-serif text-xl font-normal text-bone-950 dark:text-bone-50 tracking-tight mt-0.5">
            Bảng Đối Soát Dấu Vết Nhật Ký Song Song
          </h3>
        </div>
        <span className="font-mono text-xs text-bone-500">
          Cùng một hành vi ➔ Khác biệt về nguồn sự kiện &amp; cấu trúc trường
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-bone-300 dark:border-bone-800 text-bone-500 text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3 font-semibold min-w-[200px]">Hành vi Kỹ thuật</th>
              <th className="py-2.5 px-3 font-semibold min-w-[280px] bg-sky-500/5 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-l border-r border-bone-200 dark:border-bone-800">
                Môi trường Windows (Sysmon / Security.evtx)
              </th>
              <th className="py-2.5 px-3 font-semibold min-w-[280px] bg-amber-500/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-r border-bone-200 dark:border-bone-800">
                Môi trường Linux (auditd / eBPF / Zeek)
              </th>
              <th className="py-2.5 px-3 font-semibold min-w-[220px]">Lưu ý SOC &amp; Tuning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bone-200 dark:divide-bone-800/80">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-bone-200/30 dark:hover:bg-bone-900/30 transition-colors">
                <td className="py-3 px-3 align-top font-sans">
                  <div className="font-semibold text-bone-900 dark:text-bone-100 text-xs">
                    {row.action_category}
                  </div>
                  <div className="text-[11px] text-bone-500 mt-0.5">
                    {row.behavior_description}
                  </div>
                </td>

                <td className="py-3 px-3 align-top bg-sky-500/5 dark:bg-sky-500/10 border-l border-r border-bone-200 dark:border-bone-800 space-y-1">
                  <div className="font-bold text-sky-700 dark:text-sky-300">
                    {row.windows_event}
                  </div>
                  <div className="text-[11px] text-bone-500">
                    Nguồn: {row.windows_source}
                  </div>
                  <div className="text-[11px] text-bone-700 dark:text-bone-300 bg-bone-200/50 dark:bg-black/40 p-1.5 rounded">
                    <code>{row.windows_fields}</code>
                  </div>
                </td>

                <td className="py-3 px-3 align-top bg-amber-500/5 dark:bg-amber-500/10 border-r border-bone-200 dark:border-bone-800 space-y-1">
                  <div className="font-bold text-amber-700 dark:text-amber-300">
                    {row.linux_event}
                  </div>
                  <div className="text-[11px] text-bone-500">
                    Nguồn: {row.linux_source}
                  </div>
                  <div className="text-[11px] text-bone-700 dark:text-bone-300 bg-bone-200/50 dark:bg-black/40 p-1.5 rounded">
                    <code>{row.linux_fields}</code>
                  </div>
                </td>

                <td className="py-3 px-3 align-top font-sans text-xs text-bone-600 dark:text-bone-400 leading-relaxed">
                  {row.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
