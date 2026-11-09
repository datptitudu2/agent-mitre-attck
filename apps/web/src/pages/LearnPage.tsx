import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  EyeOff,
  HelpCircle,
  Layers,
  Radar,
  ShieldOff,
  Sparkles,
  Target,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { CurriculumResponse, GlossaryTerm, LessonItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useLessonProgress, useQuizAttempts } from '@/hooks/useUserData'
import { useUiStore } from '@/stores/useUiStore'

function VersionEvolutionSlider() {
  const [step, setStep] = useState<0 | 1 | 2>(2)

  const milestones = [
    {
      ver: 'v18',
      date: '10/2025',
      title: 'Tái cấu trúc Detection Engineering',
      tacticCount: 14,
      splitTactic: false,
      aiReady: false,
      highlights: [
        'Khai tử văn bản Detections cũ & đối tượng Data Source trung gian.',
        'Ra mắt chuỗi 3 tầng: Detection Strategy (DET) → Analytic (AN) → Data Component (DC).',
        'Bổ sung Mutable Elements để kỹ sư SOC biết tham số nào cần tinh chỉnh theo môi trường.',
      ],
    },
    {
      ver: 'v19',
      date: '28/04/2026',
      title: 'Tách đôi Defense Evasion → 15 Tactics',
      tacticCount: 15,
      splitTactic: true,
      aiReady: false,
      highlights: [
        'Defense Evasion bị tách thành Stealth (TA0005 — Ẩn mình) và Defense Impairment (TA0112 — Vô hiệu hoá phòng thủ).',
        'Ma trận Enterprise chính thức có 15 cột Tactic thay vì 14.',
        'Mobile ATT&CK lần đầu tiên có bộ Detection Strategies chuẩn hoá.',
      ],
    },
    {
      ver: 'v20 / v20.1',
      date: '10–11/2026',
      title: 'Kỷ nguyên Bảo mật Hệ thống AI & ICS Assets',
      tacticCount: 15,
      splitTactic: true,
      aiReady: true,
      highlights: [
        'Bổ sung nhóm kỹ thuật nhắm vào AI doanh nghiệp: Direct/Indirect Prompt Injection, AI Result Poisoning, Impair Autonomous Defenses, AI-Enabled Exfiltration.',
        'Mở rộng mạnh mẽ Detection Strategies cho cả Enterprise và ICS.',
        'Tăng cường liên kết thiết bị công nghiệp (ICS Assets) chịu tác động.',
      ],
    },
  ]

  const cur = milestones[step]

  return (
    <div className="rounded-3xl border border-cyan-500/35 bg-slate-950/90 p-5 sm:p-6 text-white space-y-5 shadow-xl">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-wider text-cyan-300">
            Mô phỏng Tương tác • Kéo thanh trượt để so sánh
          </span>
          <h4 className="font-display text-lg font-bold">
             Tiến hoá Kiến trúc ATT&amp;CK: v18 → v19 → v20+
          </h4>
        </div>
        <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900 p-1 gap-1">
          {milestones.map((m, idx) => (
            <button
              key={m.ver}
              type="button"
              onClick={() => setStep(idx as 0 | 1 | 2)}
              className={cn(
                'rounded-lg px-3 py-1 font-mono text-xs font-semibold transition-all',
                step === idx
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white',
              )}
            >
              {m.ver}
            </button>
          ))}
        </div>
      </div>

      {/* Thanh kéo Slider */}
      <div className="space-y-1.5 px-1">
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={step}
          aria-label="Thanh trượt phiên bản ATT&CK từ v18 đến v20"
          onChange={(e) => setStep(Number(e.target.value) as 0 | 1 | 2)}
          className="w-full accent-cyan-400 cursor-pointer"
        />
        <div className="flex justify-between font-mono text-[11px] text-slate-400">
          <span>v18 (10/2025)</span>
          <span>v19 (04/2026)</span>
          <span>v20 / v20.1 (Hiện tại)</span>
        </div>
      </div>

      {/* Trực quan hoá cấu trúc Tactic & AI */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Cấu trúc Tactic Enterprise</span>
            <span className="rounded-full bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-0.5 font-mono text-xs font-bold text-cyan-300">
              {cur.tacticCount} Tactics
            </span>
          </div>

          {!cur.splitTactic ? (
            <motion.div
              key="single-evasion"
              initial={{ opacity: 0.6, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs space-y-1"
            >
              <div className="font-mono font-bold text-amber-300">TA0005 • Defense Evasion (Cũ)</div>
              <p className="text-slate-300">
                Gộp chung cả hành vi ẩn mình lẫn hành vi tắt phần mềm bảo mật vào một cột duy nhất.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="split-evasion"
              initial={{ opacity: 0.6, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              <div className="rounded-xl border border-purple-500/45 bg-purple-500/15 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-mono font-bold text-purple-300">
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>TA0005 • Stealth</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  Ẩn mình, ngụy trang, xoá dấu vết để tránh bị phát hiện.
                </p>
              </div>
              <div className="rounded-xl border border-pink-500/45 bg-pink-500/15 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-mono font-bold text-pink-300">
                  <ShieldOff className="h-3.5 w-3.5" />
                  <span>TA0112 • Defense Impairment</span>
                </div>
                <p className="text-[11px] text-slate-200">
                  Chủ động tắt, phá hoại hoặc làm mù công cụ phòng thủ.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-bold text-cyan-300">
              {cur.ver} ({cur.date}) — {cur.title}
            </span>
            {cur.aiReady && (
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
                + AI Security
              </span>
            )}
          </div>
          <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
            {cur.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function InteractiveLessonWidget({ kind }: { kind: LessonItem['interactive_widget'] }) {
  if (kind === 'version-slider') {
    return <VersionEvolutionSlider />
  }
  if (kind === 'det-tree') {
    return (
      <div className="rounded-2xl border border-violet-500/35 bg-violet-500/5 p-5 space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-violet-600 dark:text-violet-300 font-semibold">
          Sơ đồ Chuỗi Phát hiện 3 tầng (Chuẩn ATT&amp;CK v18+)
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
          <div className="rounded-xl border border-violet-500/40 bg-white dark:bg-slate-900 p-3.5 space-y-1">
            <div className="font-mono font-bold text-violet-600 dark:text-violet-300">
              1. Detection Strategy (DETxxxx)
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Ý tưởng phát hiện cốt lõi cho 1 Technique, độc lập với công cụ SIEM/EDR cụ thể.
            </p>
          </div>
          <div className="rounded-xl border border-cyan-500/40 bg-white dark:bg-slate-900 p-3.5 space-y-1">
            <div className="font-mono font-bold text-cyan-600 dark:text-cyan-300">
              2. Analytic (ANxxxx)
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Logic phát hiện cụ thể theo nền tảng (Windows/Linux/SaaS) kèm Mutable Elements cần tinh chỉnh.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/40 bg-white dark:bg-slate-900 p-3.5 space-y-1">
            <div className="font-mono font-bold text-emerald-600 dark:text-emerald-300">
              3. Data Component (DCxxxx)
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Kênh nhật ký thực tế cần thu thập (vd: Process Creation, Application Log Content).
            </p>
          </div>
        </div>
      </div>
    )
  }
  if (kind === 'pyramid') {
    const tiers = [
      { label: 'TTPs (Hành vi ATT&CK)', note: 'Rất khó đổi — Trọng tâm của ATT&CK Lab', cls: 'w-2/5 bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-300 font-bold' },
      { label: 'Tools (Phần mềm / Công cụ)', note: 'Khó đổi — Phải viết hoặc cấu hình lại', cls: 'w-3/5 bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300' },
      { label: 'Network / Host Artifacts', note: 'Trung bình — Dấu vết giao thức, Registry', cls: 'w-4/5 bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300' },
      { label: 'Domain / IP / File Hash', note: 'Quá dễ đổi — Đổi tự động trong vài giây', cls: 'w-full bg-slate-200/80 dark:bg-slate-800 border-slate-400/30 text-slate-600 dark:text-slate-300' },
    ]
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-5 space-y-2.5">
        <div className="text-xs font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold text-center">
          Sơ đồ Kim tự tháp Nỗi đau (Pyramid of Pain)
        </div>
        <div className="flex flex-col items-center gap-2 pt-1">
          {tiers.map((t) => (
            <div
              key={t.label}
              className={cn('rounded-xl border px-4 py-2 text-center text-xs', t.cls)}
            >
              <div>{t.label}</div>
              <div className="text-[10px] opacity-80">{t.note}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export function LearnPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const openTechnique = useUiStore((s) => s.openTechnique)

  const { data, isLoading } = useQuery({
    queryKey: ['curriculum'],
    queryFn: () => apiFetch<CurriculumResponse>('/api/lessons'),
  })

  const { completedSlugs, markCompleted } = useLessonProgress()
  const { attempts, submitQuiz } = useQuizAttempts()

  const lessons = data?.lessons ?? []
  const glossary = data?.glossary ?? []

  const lessonParam = searchParams.get('lesson')
  const [activeSlug, setActiveSlug] = useState<string>('')
  const [activeTerm, setActiveTerm] = useState<GlossaryTerm | null>(null)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)

  useEffect(() => {
    if (lessonParam) {
      setActiveSlug(lessonParam)
    } else if (!activeSlug && lessons.length > 0) {
      setActiveSlug(lessons[0].slug)
    }
  }, [lessonParam, lessons, activeSlug])

  useEffect(() => {
    setSelectedAnswers({})
    setQuizSubmitted(false)
  }, [activeSlug])

  const currentLesson = lessons.find((l) => l.slug === activeSlug) ?? lessons[0]

  const handleSelectLesson = (slug: string) => {
    setActiveSlug(slug)
    setSearchParams({ lesson: slug })
  }

  const handleGradeQuiz = async () => {
    if (!currentLesson) return
    setQuizSubmitted(true)
    const total = currentLesson.quiz.length
    let score = 0
    for (const q of currentLesson.quiz) {
      if (selectedAnswers[q.id] === q.correct_index) score += 1
    }
    await submitQuiz.mutateAsync({
      quizSlug: currentLesson.slug,
      score,
      total,
      answers: selectedAnswers,
    })
    if (score >= Math.ceil(total * 0.5)) {
      await markCompleted.mutateAsync(currentLesson.slug)
    }
  }

  const bestAttempt = currentLesson
    ? attempts.find((a) => a.quiz_slug === currentLesson.slug)
    : undefined

  return (
    <div className="space-y-6">
      {/* Header + Huy hiệu tiến độ */}
      <div className="glass-card rounded-3xl p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Guided Defensive Curriculum</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Learning Path — Học MITRE ATT&amp;CK từ Con số 0
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            8 bài đọc ngắn (≤ 5 phút/bài) kèm sơ đồ tương tác, từ điển thuật ngữ tức thì và mini quiz thực hành.
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="font-mono text-lg font-bold text-slate-900 dark:text-white">
              {completedSlugs.size} / {lessons.length || 8} bài hoàn thành
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {completedSlugs.size >= 8
                ? 'Huy hiệu: Chuyên gia ATT&CK Lab!'
                : completedSlugs.size >= 4
                  ? 'Huy hiệu: Nắm vững Nền tảng!'
                  : 'Hoàn thành quiz cuối bài để nhận huy hiệu'}
            </div>
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl border',
              completedSlugs.size > 0
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-500'
                : 'border-slate-300 dark:border-slate-700 text-slate-400',
            )}
          >
            <Award className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Thanh Từ điển Thuật ngữ nhanh (Glossary Tooltip Bar) */}
      {glossary.length > 0 && (
        <div className="glass-card rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <HelpCircle className="h-3.5 w-3.5 text-cyan-500" />
            <span>Từ điển Thuật ngữ gốc (Rê chuột hoặc bấm để xem giải thích ngắn tiếng Việt):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {glossary.map((g) => (
              <button
                key={g.key}
                type="button"
                onMouseEnter={() => setActiveTerm(g)}
                onClick={() => setActiveTerm((prev) => (prev?.key === g.key ? null : g))}
                className={cn(
                  'rounded-lg border px-2.5 py-1 font-mono text-xs transition-colors',
                  activeTerm?.key === g.key
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-slate-700 dark:text-slate-300 hover:border-cyan-500/40',
                )}
              >
                {g.term}
              </button>
            ))}
          </div>

          {activeTerm && (
            <div className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 p-3.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-slate-900 dark:text-white">
                  {activeTerm.term} — <span className="text-cyan-600 dark:text-cyan-300">{activeTerm.vi_short}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTerm(null)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Đóng
                </button>
              </div>
              <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                {activeTerm.definition_vi}
              </p>
              <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                Ví dụ: {activeTerm.example_vi}
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Danh sách 8 bài bên trái */}
          <aside className="lg:col-span-4 space-y-2">
            {lessons.map((l) => {
              const isSelected = l.slug === currentLesson?.slug
              const isDone = completedSlugs.has(l.slug)
              return (
                <button
                  key={l.slug}
                  type="button"
                  onClick={() => handleSelectLesson(l.slug)}
                  className={cn(
                    'w-full rounded-2xl border p-3.5 text-left transition-all flex items-start gap-3',
                    isSelected
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-md'
                      : 'glass-card hover:border-cyan-500/40',
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold',
                      isDone
                        ? 'bg-emerald-500 text-slate-950'
                        : isSelected
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
                    )}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : l.order}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase text-cyan-600 dark:text-cyan-400 font-semibold">
                        {l.badge_label}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-400">
                        <Clock className="h-2.5 w-2.5" />
                        {l.reading_minutes}p
                      </span>
                    </div>
                    <div className="mt-0.5 font-display text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {l.title}
                    </div>
                  </div>
                </button>
              )
            })}
          </aside>

          {/* Nội dung bài học + Sơ đồ tương tác + Thử ngay + Mini Quiz */}
          {currentLesson && (
            <div className="lg:col-span-8 space-y-6">
              <article className="glass-card rounded-3xl p-6 sm:p-8 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-0.5 font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                      Bài {currentLesson.order} / {lessons.length} • {currentLesson.badge_label}
                    </span>
                    <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
                      {currentLesson.title}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => void markCompleted.mutateAsync(currentLesson.slug)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors',
                      completedSlugs.has(currentLesson.slug)
                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                        : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500/50',
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {completedSlugs.has(currentLesson.slug)
                        ? 'Đã hoàn thành bài này'
                        : 'Đánh dấu hoàn thành'}
                    </span>
                  </button>
                </div>

                {/* Sơ đồ Tương tác đặc thù (Slider v18->v19->v20, Cây DET, Pyramid...) */}
                <InteractiveLessonWidget kind={currentLesson.interactive_widget} />

                {/* Nội dung Markdown */}
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-display prose-code:text-cyan-600 dark:prose-code:text-cyan-300">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentLesson.body_md}
                  </ReactMarkdown>
                </div>

                {/* Ô "Thử ngay trên Matrix" */}
                {currentLesson.try_technique && (
                  <div className="rounded-2xl border border-cyan-500/35 bg-cyan-500/10 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-0.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Thử ngay trên dữ liệu thật của ATT&amp;CK Lab</span>
                      </div>
                      <div className="text-xs text-slate-700 dark:text-slate-200">
                        Khám phá kỹ thuật mẫu:{' '}
                        <strong className="font-mono">
                          {currentLesson.try_technique.attack_id} — {currentLesson.try_technique.name}
                        </strong>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          openTechnique(
                            currentLesson.try_technique!.attack_id,
                            currentLesson.try_technique!.domain,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                      >
                        <Radar className="h-3.5 w-3.5" />
                        <span>Mở Panel Chi tiết</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/matrix?q=${encodeURIComponent(currentLesson.try_technique!.attack_id)}`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-white/80 dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300"
                      >
                        <Target className="h-3.5 w-3.5" />
                        <span>Xem trên Ma trận</span>
                      </button>
                    </div>
                  </div>
                )}
              </article>

              {/* Mini Quiz cuối bài */}
              {currentLesson.quiz.length > 0 && (
                <section className="glass-card rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
                      <Layers className="h-5 w-5 text-violet-500" />
                      <span>Mini Quiz Kiểm tra Nhanh ({currentLesson.quiz.length} câu)</span>
                    </div>
                    {bestAttempt && (
                      <span className="rounded-full bg-emerald-500/15 border border-emerald-500/40 px-3 py-0.5 font-mono text-xs text-emerald-600 dark:text-emerald-300">
                        Lần làm gần nhất: {bestAttempt.score}/{bestAttempt.total}
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {currentLesson.quiz.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-2.5"
                      >
                        <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                          Câu {qIdx + 1}: {q.question}
                        </div>
                        <div className="space-y-1.5">
                          {q.options.map((opt, optIdx) => {
                            const picked = selectedAnswers[q.id] === optIdx
                            const isCorrect = q.correct_index === optIdx
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  if (!quizSubmitted) {
                                    setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                                  }
                                }}
                                className={cn(
                                  'w-full rounded-xl border px-3.5 py-2.5 text-left text-xs transition-all',
                                  quizSubmitted
                                    ? isCorrect
                                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-semibold'
                                      : picked
                                        ? 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-200'
                                        : 'border-slate-200 dark:border-slate-800 opacity-70'
                                    : picked
                                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 font-semibold'
                                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 text-slate-700 dark:text-slate-200 hover:border-cyan-500/40',
                                )}
                              >
                                {opt}
                              </button>
                            )
                          })}
                        </div>

                        {quizSubmitted && (
                          <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-3 text-xs text-slate-700 dark:text-slate-200">
                            <strong>Giải thích:</strong> {q.explanation_vi}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {quizSubmitted ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAnswers({})
                          setQuizSubmitted(false)
                        }}
                        className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200"
                      >
                        Làm lại Quiz
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">
                        Chọn đáp án cho tất cả câu hỏi rồi bấm nộp bài.
                      </span>
                    )}

                    {!quizSubmitted && (
                      <button
                        type="button"
                        disabled={
                          Object.keys(selectedAnswers).length < currentLesson.quiz.length ||
                          submitQuiz.isPending
                        }
                        onClick={() => void handleGradeQuiz()}
                        className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-2.5 text-xs font-bold text-white hover:from-cyan-400 hover:to-violet-500 disabled:opacity-45"
                      >
                        {submitQuiz.isPending ? 'Đang lưu kết quả...' : 'Chấm điểm & Hoàn thành Bài'}
                      </button>
                    )}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
