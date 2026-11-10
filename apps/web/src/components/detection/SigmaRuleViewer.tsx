import { useState } from 'react'
import { Check, Copy, Filter, ShieldAlert } from 'lucide-react'
import type { SigmaRule } from '@/lib/types'

interface SigmaRuleViewerProps {
  rule: SigmaRule
  compact?: boolean
}

export function SigmaRuleViewer({ rule, compact = false }: SigmaRuleViewerProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'visual' | 'yaml'>('visual')

  const copyYaml = async () => {
    try {
      await navigator.clipboard.writeText(rule.raw_yaml)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const levelColor = {
    critical: 'border-rose-500/60 bg-rose-500/10 text-rose-500',
    high: 'border-signal-amber bg-signal-amber/10 text-signal-amber',
    medium: 'border-amber-400 bg-amber-400/10 text-amber-500',
    low: 'border-bone-400 bg-bone-400/10 text-bone-400',
  }[rule.level] || 'border-bone-400 bg-bone-400/10 text-bone-400'

  return (
    <div
      className={`rounded-xl border border-bone-300 dark:border-bone-800 bg-bone-100/60 dark:bg-bone-950/80 overflow-hidden shadow-sm ${
        compact ? 'text-xs' : ''
      }`}
    >
      {/* Header bar */}
      <div
        className={`${
          compact ? 'p-3' : 'p-4'
        } border-b border-bone-200 dark:border-bone-800 bg-bone-200/40 dark:bg-bone-900/40 flex flex-wrap items-start justify-between gap-3`}
      >
        <div className="space-y-1 grow">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span
              className={`px-2 py-0.5 rounded-xs font-bold uppercase tracking-wider border ${levelColor}`}
            >
              LEVEL: {rule.level}
            </span>
            <span className="text-bone-400">·</span>
            <span className="text-bone-600 dark:text-bone-400 font-medium">
              {rule.logsource.product || 'windows'} // {rule.logsource.category || 'process_creation'}
            </span>
            <span className="text-bone-400">·</span>
            <span className="text-bone-500">Tác giả: {rule.author}</span>
          </div>

          <h3 className="font-sans font-bold text-base text-bone-900 dark:text-bone-100 leading-snug">
            {rule.title}
          </h3>

          <p className="text-xs text-bone-600 dark:text-bone-400 leading-relaxed font-sans pt-0.5">
            {rule.description}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-lg border border-bone-300 dark:border-bone-700 p-0.5 bg-bone-200/60 dark:bg-bone-900/60 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'visual'
                  ? 'bg-signal-amber text-black font-semibold'
                  : 'text-bone-600 dark:text-bone-400 hover:text-bone-900 dark:hover:text-bone-200'
              }`}
            >
              Trực quan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('yaml')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'yaml'
                  ? 'bg-signal-amber text-black font-semibold'
                  : 'text-bone-600 dark:text-bone-400 hover:text-bone-900 dark:hover:text-bone-200'
              }`}
            >
              Sigma YAML
            </button>
          </div>

          <button
            type="button"
            onClick={() => void copyYaml()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-bone-300 dark:border-bone-700 font-mono text-[11px] text-bone-700 dark:text-bone-300 hover:bg-bone-200 dark:hover:bg-bone-800 transition-colors"
            title="Sao chép toàn văn luật Sigma"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Đã sao chép' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Body content */}
      <div className="p-4 space-y-4">
        {activeTab === 'yaml' ? (
          <pre className="p-3.5 rounded-lg bg-bone-200/50 dark:bg-black/70 font-mono text-xs text-bone-800 dark:text-bone-200 overflow-x-auto leading-relaxed border border-bone-300/60 dark:border-bone-800">
            <code>{rule.raw_yaml}</code>
          </pre>
        ) : (
          <div className="space-y-4 font-mono text-xs">
            {/* Logic Box */}
            <div className="rounded-lg border border-bone-300/80 dark:border-bone-800/80 bg-bone-50/50 dark:bg-black/40 p-3.5 space-y-3">
              <div className="flex items-center gap-1.5 text-signal-amber font-bold text-[11px] uppercase tracking-wider">
                <Filter className="h-3.5 w-3.5" />
                <span>Điều kiện Phát hiện (Detection Tree)</span>
              </div>

              <div className="space-y-2">
                {Object.entries(rule.detection).map(([selKey, selVal]) => {
                  if (selKey === 'condition') return null
                  return (
                    <div
                      key={selKey}
                      className="p-2.5 rounded border border-bone-200 dark:border-bone-800 bg-bone-100/40 dark:bg-bone-900/30 space-y-1.5"
                    >
                      <div className="text-bone-500 text-[10px] uppercase font-bold">
                        Nhánh lọc: {selKey}
                      </div>
                      <pre className="text-bone-800 dark:text-bone-200 text-xs overflow-x-auto">
                        <code>{JSON.stringify(selVal, null, 2)}</code>
                      </pre>
                    </div>
                  )
                })}

                {rule.detection.condition && (
                  <div className="pt-2 border-t border-bone-200 dark:border-bone-800 flex items-center gap-2">
                    <span className="text-bone-500 text-[11px] uppercase font-bold">
                      Công thức gộp:
                    </span>
                    <span className="px-2 py-0.5 rounded bg-signal-amber/15 text-signal-amber font-bold">
                      {rule.detection.condition}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* False Positives & Hunting Notes */}
            {rule.falsepositives && rule.falsepositives.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-3 space-y-1.5 font-sans">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Dương tính giả có thể gặp (False Positives)</span>
                </div>
                <ul className="list-disc list-inside text-xs text-bone-700 dark:text-bone-300 space-y-1">
                  {rule.falsepositives.map((fp, i) => (
                    <li key={i}>{fp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
