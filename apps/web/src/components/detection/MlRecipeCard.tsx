import { useState } from 'react'
import { Check, Copy, ExternalLink, Lightbulb, PlayCircle } from 'lucide-react'
import type { MlFeatureRecipe } from '@/lib/types'

interface MlRecipeCardProps {
  recipe: MlFeatureRecipe
}

export function MlRecipeCard({ recipe }: MlRecipeCardProps) {
  const [activeCode, setActiveCode] = useState<'python' | 'sql'>('python')
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    const code = activeCode === 'python' ? recipe.extraction_logic_python : recipe.extraction_logic_sql
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const diffColor = {
    beginner: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500',
    intermediate: 'border-signal-amber bg-signal-amber/10 text-signal-amber',
    advanced: 'border-rose-500/50 bg-rose-500/10 text-rose-500',
  }[recipe.difficulty]

  return (
    <div className="rounded-xl border border-bone-300 dark:border-bone-800 bg-bone-100/60 dark:bg-bone-950/80 overflow-hidden shadow-sm space-y-4 p-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-bone-200 dark:border-bone-800 pb-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className={`px-2 py-0.5 rounded-xs font-bold uppercase tracking-wider border ${diffColor}`}>
              MỨC ĐỘ: {recipe.difficulty}
            </span>
            <span className="text-bone-400">·</span>
            <span className="font-semibold text-signal-amber">
              {recipe.technique_id} // {recipe.technique_name}
            </span>
          </div>

          <h3 className="font-sans font-bold text-lg text-bone-900 dark:text-bone-100">
            {recipe.feature_name}
          </h3>
        </div>

        {recipe.colab_notebook_url && (
          <a
            href={recipe.colab_notebook_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-signal-amber text-black font-mono text-xs font-bold hover:brightness-110 transition-all shadow-sm"
          >
            <PlayCircle className="h-4 w-4" />
            <span>Mở Colab Notebook</span>
            <ExternalLink className="h-3 w-3 ml-0.5" />
          </a>
        )}
      </div>

      {/* Formula Box */}
      <div className="p-3.5 rounded-lg border border-bone-300 dark:border-bone-800 bg-bone-200/50 dark:bg-black/50 font-mono text-xs space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-bone-500">
          Công thức toán học trích xuất:
        </div>
        <div className="text-bone-900 dark:text-bone-100 font-semibold overflow-x-auto py-1">
          <code>{recipe.feature_formula}</code>
        </div>
      </div>

      {/* Intuition Box */}
      <div className="p-3.5 rounded-lg border border-signal-amber/30 bg-signal-amber/5 dark:bg-signal-amber/10 space-y-1.5">
        <div className="flex items-center gap-1.5 text-signal-amber font-mono text-xs font-bold uppercase tracking-wider">
          <Lightbulb className="h-4 w-4" />
          <span>Bản chất trực giác an ninh mạng (Security Intuition)</span>
        </div>
        <p className="text-xs text-bone-800 dark:text-bone-200 leading-relaxed font-sans">
          {recipe.intuition_vietnamese}
        </p>
      </div>

      {/* Code Logic Switcher */}
      <div className="space-y-2 font-mono text-xs">
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-lg border border-bone-300 dark:border-bone-700 p-0.5 bg-bone-200/60 dark:bg-bone-900/60 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveCode('python')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeCode === 'python'
                  ? 'bg-signal-amber text-black font-semibold'
                  : 'text-bone-600 dark:text-bone-400 hover:text-bone-900 dark:hover:text-bone-200'
              }`}
            >
              Python / Feature Engineering
            </button>
            <button
              type="button"
              onClick={() => setActiveCode('sql')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeCode === 'sql'
                  ? 'bg-signal-amber text-black font-semibold'
                  : 'text-bone-600 dark:text-bone-400 hover:text-bone-900 dark:hover:text-bone-200'
              }`}
            >
              SQL / SIEM Query
            </button>
          </div>

          <button
            type="button"
            onClick={() => void copyCode()}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-bone-300 dark:border-bone-700 text-bone-700 dark:text-bone-300 hover:bg-bone-200 dark:hover:bg-bone-800 transition-colors text-[11px]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Đã sao chép' : 'Copy'}</span>
          </button>
        </div>

        <pre className="p-3.5 rounded-lg bg-bone-200/40 dark:bg-black/60 text-bone-800 dark:text-bone-200 overflow-x-auto leading-relaxed border border-bone-300/60 dark:border-bone-800 max-h-56">
          <code>{activeCode === 'python' ? recipe.extraction_logic_python : recipe.extraction_logic_sql}</code>
        </pre>
      </div>

      {/* Signal vs Noise footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-sans text-xs">
        <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 space-y-1">
          <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
            ✓ Tín hiệu True Positive:
          </span>
          <p className="text-bone-700 dark:text-bone-300 leading-relaxed">
            {recipe.expected_tp_signal}
          </p>
        </div>

        <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-1">
          <span className="font-mono text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase">
            ! Nhiễu False Positive:
          </span>
          <p className="text-bone-700 dark:text-bone-300 leading-relaxed">
            {recipe.expected_fp_noise}
          </p>
        </div>
      </div>
    </div>
  )
}
