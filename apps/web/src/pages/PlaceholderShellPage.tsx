import { ShieldAlert } from 'lucide-react'

interface PlaceholderShellPageProps {
  title: string
  phaseNote: string
}

export function PlaceholderShellPage({ title, phaseNote }: PlaceholderShellPageProps) {
  return (
    <div className="glass-card rounded-3xl p-8">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-cyan-400" />
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{phaseNote}</p>
    </div>
  )
}
