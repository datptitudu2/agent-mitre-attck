import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Copy, Terminal, Sparkles, ShieldAlert } from 'lucide-react'
import type { AnnotatedLogSample } from '@/lib/types'

interface AnnotatedLogReaderProps {
  sample: AnnotatedLogSample
  compact?: boolean
}

export function AnnotatedLogReader({ sample, compact: _compact = false }: AnnotatedLogReaderProps) {
  const [activeField, setActiveField] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'annotated' | 'raw'>('annotated')

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(sample.raw_log, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const annotations = sample.annotations || {}
  const rawLog = sample.raw_log || {}

  return (
    <div className="rounded-xl border border-bone-300 dark:border-bone-800 bg-bone-100/60 dark:bg-bone-950/80 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-bone-200 dark:border-bone-800 bg-bone-200/50 dark:bg-bone-900/50 font-mono text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-signal-amber" />
          <span className="font-semibold text-bone-900 dark:text-bone-100">
            {sample.scenario_title}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-bone-300/40 dark:bg-bone-800/60 text-bone-700 dark:text-bone-300">
            {sample.collector_name} ({sample.collector_os})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-bone-300 dark:border-bone-700 p-0.5 bg-bone-200/60 dark:bg-bone-900/60">
            <button
              type="button"
              onClick={() => setViewMode('annotated')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                viewMode === 'annotated'
                  ? 'bg-signal-amber text-black font-semibold'
                  : 'text-bone-600 dark:text-bone-400 hover:text-bone-900 dark:hover:text-bone-200'
              }`}
            >
              Chú thích AI
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                viewMode === 'raw'
                  ? 'bg-signal-amber text-black font-semibold'
                  : 'text-bone-600 dark:text-bone-400 hover:text-bone-900 dark:hover:text-bone-200'
              }`}
            >
              Raw JSON
            </button>
          </div>

          <button
            type="button"
            onClick={() => void copyJson()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-bone-300 dark:border-bone-700 text-bone-700 dark:text-bone-300 hover:bg-bone-200 dark:hover:bg-bone-800 transition-colors"
            title="Sao chép JSON mẫu"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="text-[11px]">{copied ? 'Đã sao chép' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Description */}
      {sample.scenario_description && (
        <div className="px-4 py-2 border-b border-bone-200/80 dark:border-bone-800/80 text-xs text-bone-600 dark:text-bone-400 italic bg-bone-50/50 dark:bg-bone-950/40">
          💡 {sample.scenario_description}
        </div>
      )}

      {/* Content Area */}
      <div className="p-4">
        {viewMode === 'raw' ? (
          <pre className="p-3 rounded-lg bg-bone-200/40 dark:bg-black/60 font-mono text-xs text-bone-800 dark:text-bone-200 overflow-x-auto leading-relaxed max-h-96">
            <code>{JSON.stringify(rawLog, null, 2)}</code>
          </pre>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Log Fields Table */}
            <div className={`${activeField ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-1 font-mono text-xs`}>
              <div className="text-[11px] uppercase tracking-wider text-bone-500 font-semibold mb-2">
                Di chuột vào trường có biểu tượng ❖ để xem phân tích SOC:
              </div>

              <div className="rounded-lg border border-bone-200 dark:border-bone-800/80 divide-y divide-bone-200/60 dark:divide-bone-800/60 overflow-hidden bg-bone-50/40 dark:bg-black/40">
                {Object.entries(rawLog).map(([key, value]) => {
                  const hasAnnotation = Boolean(annotations[key])
                  const isSelected = activeField === key
                  const formattedValue =
                    typeof value === 'object' && value !== null
                      ? JSON.stringify(value)
                      : String(value)

                  return (
                    <div
                      key={key}
                      onMouseEnter={() => hasAnnotation && setActiveField(key)}
                      onClick={() => hasAnnotation && setActiveField(key)}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 py-1.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-signal-amber/15 dark:bg-signal-amber/20 border-l-2 border-signal-amber'
                          : hasAnnotation
                          ? 'hover:bg-bone-200/50 dark:hover:bg-bone-800/40'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 shrink-0 min-w-[140px]">
                        {hasAnnotation ? (
                          <span className="text-signal-amber text-xs animate-pulse font-bold" title="Có chú thích phát hiện">
                            ❖
                          </span>
                        ) : (
                          <span className="text-bone-400 dark:text-bone-600 text-xs">•</span>
                        )}
                        <span
                          className={`font-semibold ${
                            hasAnnotation
                              ? 'text-signal-amber underline decoration-dashed underline-offset-2'
                              : 'text-bone-700 dark:text-bone-300'
                          }`}
                        >
                          {key}
                        </span>
                      </div>

                      <div className="grow overflow-hidden text-ellipsis whitespace-nowrap text-right max-w-full sm:max-w-md text-bone-900 dark:text-bone-100 font-medium">
                        <span title={formattedValue}>{formattedValue}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Active Annotation Card */}
            <AnimatePresence>
              {activeField && annotations[activeField] && (
                <motion.div
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.15 }}
                  className="lg:col-span-5 flex flex-col rounded-lg border border-signal-amber/40 bg-signal-amber/5 dark:bg-signal-amber/10 p-3.5 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-signal-amber/20 pb-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-signal-amber" />
                      <span className="font-mono text-xs font-bold text-signal-amber">
                        TRƯỜNG: {activeField}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveField(null)}
                      className="text-bone-400 hover:text-bone-700 dark:hover:text-bone-200 text-xs px-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-xs text-bone-800 dark:text-bone-200 leading-relaxed font-sans">
                    {annotations[activeField]}
                  </div>

                  <div className="pt-2 border-t border-signal-amber/20 font-mono text-[11px] text-bone-500 dark:text-bone-400 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-signal-amber" />
                    <span>Dữ liệu thực chiến: {sample.technique_id}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
