import { ExternalLink, ShieldCheck } from 'lucide-react'

interface MitreFooterProps {
  versionLabel?: string
}

export function MitreFooter({ versionLabel }: MitreFooterProps) {
  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-cyber-surface/70 backdrop-blur-md px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 sm:flex-row">
        <div className="flex flex-wrap items-center gap-2 text-center sm:text-left">
          <ShieldCheck className="h-4 w-4 text-cyan-500 shrink-0" />
          <span>
            © The MITRE Corporation. ATT&amp;CK® is a registered trademark of The MITRE Corporation.
          </span>
          <a
            href="https://attack.mitre.org/resources/terms-of-use/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 underline-offset-4 hover:underline"
          >
            Terms of Use
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
            Giáo dục phòng thủ
          </span>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[11px] text-cyan-700 dark:text-cyan-300">
            {versionLabel ?? 'STIX 2.1 Live Feed'}
          </span>
        </div>
      </div>
    </footer>
  )
}

