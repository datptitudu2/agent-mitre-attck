import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  EyeOff,
  Grid3X3,
  PlaySquare,
  Radar,
  ShieldOff,
  Sparkles,
  Target,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { VersionsResponse } from '@/lib/types'
import { useBookmarks, useLessonProgress } from '@/hooks/useUserData'
import { useUiStore } from '@/stores/useUiStore'

function CountUpNumber({ target }: { target: number }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!target) {
      setDisplay(0)
      return
    }
    let frame = 0
    const totalFrames = 26
    const timer = setInterval(() => {
      frame += 1
      const progress = Math.min(frame / totalFrames, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(target * eased))
      if (frame >= totalFrames) clearInterval(timer)
    }, 24)
    return () => clearInterval(timer)
  }, [target])

  return <>{display.toLocaleString('vi-VN')}</>
}

export function DashboardPage() {
  const openTechnique = useUiStore((s) => s.openTechnique)
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const { bookmarks } = useBookmarks()
  const { completedSlugs } = useLessonProgress()

  const { data: versionsData } = useQuery({
    queryKey: ['versions'],
    queryFn: () => apiFetch<VersionsResponse>('/api/versions'),
  })

  const enterprise = versionsData?.domains.find((d) => d.domain === 'enterprise-attack')
  const stats = enterprise?.stats ?? {}
  const currentVer = enterprise?.current_version ?? '...'

  const statCards = [
    { label: 'Enterprise Tactics', value: stats.tactics ?? 0, sub: 'Gồm Stealth & Defense Impairment' },
    { label: 'Techniques', value: stats.techniques ?? 0, sub: `+ ${stats.subtechniques ?? 0} Sub-techniques` },
    { label: 'Detection Strategies', value: stats.detection_strategies ?? 0, sub: `${stats.analytics ?? 0} Analytics (v18+)` },
    { label: 'Data Components', value: stats.data_components ?? 0, sub: 'Nguồn log & Telemetry chuẩn' },
    { label: 'Groups & Campaigns', value: (stats.groups ?? 0) + (stats.campaigns ?? 0), sub: `${stats.groups ?? 0} Groups • ${stats.campaigns ?? 0} Campaigns` },
    { label: 'Software (Malware/Tool)', value: stats.software ?? 0, sub: `${stats.mitigations ?? 0} Mitigations` },
  ]

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-slate-900 via-cyber-surface to-indigo-950/80 p-7 sm:p-10 text-white shadow-2xl"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl"
        />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3.5 py-1 text-xs font-mono text-cyan-200">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              <span>Dữ liệu chính thức MITRE ATT&amp;CK v{currentVer} (STIX 2.1 Live)</span>
            </div>

            <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
              Phòng thí nghiệm Trực quan hoá{' '}
              <span className="bg-gradient-to-r from-cyan-300 to-violet-300 bg-clip-text text-transparent">
                MITRE ATT&amp;CK
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Hiểu bản chất hành vi tấn công qua ngôn ngữ đời thường, mổ xẻ từng bước chiến dịch có thật
              và chuyển hoá ngay thành chiến lược phát hiện{' '}
              <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-cyan-200">
                DET → AN → Data Component
              </code>{' '}
              cho đội ngũ phòng thủ.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                to="/matrix"
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 transition-colors"
              >
                <Grid3X3 className="h-4 w-4" />
                <span>Khám phá Ma trận 15 Tactics</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/cases"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/15 transition-colors"
              >
                <PlaySquare className="h-4 w-4 text-violet-300" />
                <span>Chạy Attack Chain Player</span>
              </Link>

              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2.5 font-mono text-xs text-slate-300 hover:border-cyan-400/50"
              >
                <span>Tìm nhanh</span>
                <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-300">
                  Ctrl + K
                </kbd>
              </button>
            </div>
          </div>

          {/* Tóm tắt điểm mới kiến trúc ATT&CK v18 -> v19 -> v20 */}
          <div className="w-full lg:max-w-md rounded-2xl border border-white/15 bg-slate-950/60 backdrop-blur-md p-5 space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-cyan-300">
              3 Thay đổi lớn bạn cần nắm (v18 → v{currentVer})
            </div>
            <div className="space-y-2.5 text-xs text-slate-200">
              <div className="flex items-start gap-2.5">
                <Radar className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <strong>v18+:</strong> Thay Data Sources cũ bằng chuỗi{' '}
                  <span className="text-cyan-300 font-mono">Detection Strategy → Analytic → Data Component</span>.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="flex gap-1 shrink-0 mt-0.5">
                  <EyeOff className="h-4 w-4 text-purple-400" />
                  <ShieldOff className="h-4 w-4 text-pink-400" />
                </div>
                <div>
                  <strong>v19+:</strong> <em>Defense Evasion</em> tách đôi thành{' '}
                  <span className="text-purple-300 font-semibold">Stealth (TA0005)</span> &amp;{' '}
                  <span className="text-pink-300 font-semibold">Defense Impairment (TA0112)</span> →{' '}
                  <strong>15 Tactics</strong>.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>v20+:</strong> Bổ sung nhóm kỹ thuật nhắm vào hệ thống <strong>AI / LLM</strong>{' '}
                  (Prompt Injection, AI Exfiltration…) &amp; ngữ cảnh ICS Asset.
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Live Stats Grid (100% từ dữ liệu đã đồng bộ, không hard-code) */}
      <section aria-label="Số liệu trực tiếp từ cơ sở dữ liệu">
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-card rounded-2xl p-4"
            >
              <div className="font-mono text-2xl font-bold text-slate-900 dark:text-white">
                <CountUpNumber target={card.value} />
              </div>
              <div className="mt-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                {card.label}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {card.sub}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3 Thẻ Hành động Trọng tâm */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Link
          to="/learn"
          className="glass-card group rounded-3xl p-6 hover:border-cyan-500/50 transition-all flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-500">
              <BookOpen className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Tiếp tục Học từ Con số 0
            </h2>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              8 bài học ngắn (≤ 5 phút/bài) kèm sơ đồ tương tác, thanh trượt tiến hoá v18→v20 và
              mini quiz cuối bài.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-cyan-600 dark:text-cyan-400">
            <span>Đã hoàn thành: {completedSlugs.size} / 8 bài</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/cases"
          className="glass-card group rounded-3xl p-6 hover:border-violet-500/50 transition-all flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500">
              <PlaySquare className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Case Studies Thực chiến
            </h2>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Xem từng bước SolarWinds, NotPetya, APT32 (OceanLotus), sự cố lưới điện Ukraine (ICS)
              và kịch bản minh hoạ AI trên đồ thị động.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-violet-600 dark:text-violet-400">
            <span>Mở Attack Chain Player</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          to="/coverage"
          className="glass-card group rounded-3xl p-6 hover:border-emerald-500/50 transition-all flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <Target className="h-5 w-5" />
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Coverage Lab &amp; Có gì mới
            </h2>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              Đánh dấu những kỹ thuật đội bạn đã có rule phát hiện, nhận gợi ý lỗ hổng ưu tiên và
              xuất file JSON chuẩn ATT&amp;CK Navigator.
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <span>Đo độ phủ phòng thủ</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </section>

      {/* Bookmarks của riêng bạn */}
      {bookmarks.length > 0 && (
        <section className="glass-card rounded-3xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-slate-900 dark:text-white">
            <Bookmark className="h-4 w-4 text-amber-500 fill-amber-500" />
            <span>Technique bạn đã đánh dấu ({bookmarks.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {bookmarks.slice(0, 12).map((bm) => (
              <button
                key={bm.id}
                type="button"
                onClick={() => openTechnique(bm.attack_id, bm.domain)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 font-mono text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
              >
                <span>{bm.attack_id}</span>
                <span className="text-[10px] opacity-75">({bm.domain.replace('-attack', '')})</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
