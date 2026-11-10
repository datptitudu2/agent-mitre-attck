import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  EyeOff,
  HelpCircle,
  Layers,
  Radar,
  RotateCcw,
  ShieldOff,
  Target,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { CurriculumResponse, GlossaryTerm, LessonItem } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useLessonProgress, useQuizAttempts } from '@/hooks/useUserData'
import { useUiStore } from '@/stores/useUiStore'
import { PyramidOfPainSvg } from '@/components/learn/PyramidOfPainSvg'

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
    <div className="relative border border-line bg-ink-900 p-5 sm:p-6 text-bone-100 space-y-5 rounded-xs">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-widest text-attack">
            MÔ PHỎNG TƯƠNG TÁC // KÉO THANH TRƯỢT ĐỂ SO SÁNH
          </span>
          <h4 className="font-display text-xl font-bold tracking-tight text-bone-100 mt-0.5">
            Tiến hoá Kiến trúc ATT&amp;CK: v18 → v19 → v20+
          </h4>
        </div>
        <div className="inline-flex border border-line bg-ink-950 p-1 gap-1 rounded-xs">
          {milestones.map((m, idx) => (
            <button
              key={m.ver}
              type="button"
              onClick={() => setStep(idx as 0 | 1 | 2)}
              className={cn(
                'rounded-xs px-3 py-1 font-mono text-xs font-semibold transition-all',
                step === idx
                  ? 'bg-attack text-ink-950'
                  : 'text-bone-400 hover:text-bone-100 hover:bg-ink-800',
              )}
            >
              {m.ver}
            </button>
          ))}
        </div>
      </div>

      {/* Thanh kéo Slider */}
      <div className="space-y-2 px-1">
        <input
          type="range"
          min={0}
          max={2}
          step={1}
          value={step}
          aria-label="Thanh trượt phiên bản ATT&CK từ v18 đến v20"
          onChange={(e) => setStep(Number(e.target.value) as 0 | 1 | 2)}
          className="w-full accent-attack cursor-pointer"
        />
        <div className="flex justify-between font-mono text-[11px] text-bone-500">
          <span>v18 (10/2025)</span>
          <span>v19 (04/2026)</span>
          <span>v20 / v20.1 (Hiện tại)</span>
        </div>
      </div>

      {/* Trực quan hoá cấu trúc Tactic & AI */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 pt-1">
        <div className="border border-line bg-ink-950/70 p-4 space-y-3 rounded-xs">
          <div className="flex items-center justify-between border-b border-line/60 pb-2">
            <span className="font-mono text-xs uppercase tracking-wider text-bone-300">
              CẤU TRÚC TACTIC ENTERPRISE
            </span>
            <span className="font-mono text-xs font-bold text-attack border border-attack/30 bg-attack-muted/20 px-2 py-0.5 rounded-xs">
              {cur.tacticCount} TACTICS
            </span>
          </div>

          {!cur.splitTactic ? (
            <motion.div
              key="single-evasion"
              initial={{ opacity: 0.6, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-caution/40 bg-caution/10 p-3.5 text-xs space-y-1 rounded-xs"
            >
              <div className="font-mono font-bold text-caution">TA0005 • DEFENSE EVASION (CŨ)</div>
              <p className="text-bone-300 font-sans leading-relaxed">
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
              <div className="border border-line bg-ink-900 p-3 text-xs space-y-1 rounded-xs">
                <div className="flex items-center gap-1.5 font-mono font-bold text-attack">
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>TA0005 • STEALTH</span>
                </div>
                <p className="text-[11px] text-bone-300 font-sans leading-relaxed">
                  Ẩn mình, ngụy trang, xoá dấu vết để tránh bị phát hiện.
                </p>
              </div>
              <div className="border border-attack/40 bg-attack-muted/20 p-3 text-xs space-y-1 rounded-xs">
                <div className="flex items-center gap-1.5 font-mono font-bold text-attack">
                  <ShieldOff className="h-3.5 w-3.5" />
                  <span>TA0112 • DEFENSE IMPAIRMENT</span>
                </div>
                <p className="text-[11px] text-bone-300 font-sans leading-relaxed">
                  Chủ động tắt, phá hoại hoặc làm mù công cụ phòng thủ.
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="border border-line bg-ink-950/70 p-4 space-y-2.5 rounded-xs">
          <div className="flex items-center justify-between border-b border-line/60 pb-2">
            <span className="font-display text-sm font-bold text-bone-100">
              {cur.ver} ({cur.date}) — {cur.title}
            </span>
            {cur.aiReady && (
              <span className="font-mono text-[10px] font-bold text-defend border border-defend/30 bg-defend-muted/20 px-2 py-0.5 rounded-xs">
                + AI THREATS
              </span>
            )}
          </div>
          <ul className="space-y-1.5 text-xs text-bone-300 list-disc pl-4 font-sans leading-relaxed">
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
      <div className="border border-line bg-ink-900 p-5 space-y-3 rounded-xs text-bone-100">
        <div className="text-xs font-mono uppercase tracking-widest text-defend font-semibold">
          ❖ SƠ ĐỒ CHUỖI PHÁT HIỆN 3 TẦNG (CHUẨN ATT&amp;CK V18+)
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
          <div className="border border-line bg-ink-950/80 p-3.5 space-y-1.5 rounded-xs">
            <div className="font-mono font-bold text-bone-100 flex items-center gap-1.5">
              <span className="text-defend">01</span>
              <span>Detection Strategy (DET)</span>
            </div>
            <p className="text-bone-300 font-sans leading-relaxed">
              Ý tưởng phát hiện cốt lõi cho 1 Technique, độc lập với công cụ SIEM/EDR cụ thể.
            </p>
          </div>
          <div className="border border-line bg-ink-950/80 p-3.5 space-y-1.5 rounded-xs">
            <div className="font-mono font-bold text-bone-100 flex items-center gap-1.5">
              <span className="text-defend">02</span>
              <span>Analytic (AN)</span>
            </div>
            <p className="text-bone-300 font-sans leading-relaxed">
              Logic phát hiện cụ thể theo nền tảng (Windows/Linux/SaaS) kèm Mutable Elements cần tinh chỉnh.
            </p>
          </div>
          <div className="border border-line bg-ink-950/80 p-3.5 space-y-1.5 rounded-xs">
            <div className="font-mono font-bold text-bone-100 flex items-center gap-1.5">
              <span className="text-defend">03</span>
              <span>Data Component (DC)</span>
            </div>
            <p className="text-bone-300 font-sans leading-relaxed">
              Kênh nhật ký thực tế cần thu thập (vd: Process Creation, Application Log Content).
            </p>
          </div>
        </div>
      </div>
    )
  }
  if (kind === 'pyramid') {
    return <PyramidOfPainSvg />
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
    <div className="space-y-6 text-bone-100 font-sans">
      {/* Header + Tiến độ chuẩn Dossier (Hàng tiến độ nằm riêng bên dưới, độc lập và chống đè nav) */}
      <div className="border border-line bg-ink-900 rounded-xs overflow-hidden scroll-mt-28">
        <div className="p-6 space-y-2">
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-attack">
            <BookOpen className="h-3.5 w-3.5" />
            <span>HỒ SƠ GIÁO TRÌNH PHÒNG THỦ // GUIDED DEFENSIVE CURRICULUM</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-bone-100">
            Học MITRE ATT&amp;CK Từ Thực Tế Chiến Trường
          </h1>
          <p className="text-xs sm:text-sm text-bone-300 font-sans max-w-3xl leading-relaxed">
            8 bài nghiên cứu cô đọng (≤ 5 phút/bài) kết hợp sơ đồ phân tách kiến trúc v18–v20, từ điển thuật ngữ đối chiếu và bài tập lượng giá.
          </p>
        </div>

        {/* Hàng Tiến độ Toàn màn hình Độc lập */}
        <div className="border-t border-line bg-ink-950 px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-mono">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-xs border text-xs',
                completedSlugs.size > 0
                  ? 'border-defend/50 bg-defend-muted/20 text-defend'
                  : 'border-line text-bone-500 bg-ink-900',
              )}
            >
              <Award className="h-3.5 w-3.5" />
            </div>
            <div className="text-xs font-bold text-bone-100">
              TIẾN ĐỘ: <span className="text-defend">{completedSlugs.size}</span> / {lessons.length || 8} BÀI HOÀN THÀNH
            </div>
          </div>

          {/* 8 ô phân đoạn tiến độ */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => {
              const isDone = i < completedSlugs.size
              return (
                <div
                  key={i}
                  className={cn(
                    'h-2 w-5 sm:w-6 rounded-xs transition-colors',
                    isDone
                      ? 'bg-defend'
                      : 'border border-line bg-ink-900',
                  )}
                  title={`Bài ${i + 1}: ${isDone ? 'Đã hoàn thành' : 'Chưa hoàn thành'}`}
                />
              )
            })}
          </div>

          <div className="text-[11px] text-bone-500">
            {completedSlugs.size >= 8
              ? '❖ CHỨNG NHẬN: CHUYÊN GIA ATT&CK LAB'
              : completedSlugs.size >= 4
                ? '❖ CỘT MỐC: NẮM VỮNG NỀN TẢNG'
                : 'Hoàn thành bài tập để xác nhận tiến độ'}
          </div>
        </div>
      </div>

      {/* Thanh Từ điển Thuật ngữ nhanh (Glossary Bar) */}
      {glossary.length > 0 && (
        <div className="border border-line bg-ink-900 p-4 space-y-2.5 rounded-xs">
          <div className="flex items-center gap-1.5 font-mono text-xs text-bone-300">
            <HelpCircle className="h-3.5 w-3.5 text-defend" />
            <span>TỪ ĐIỂN THUẬT NGỮ THỰC ĐỊA (RÊ CHUỘT HOẶC BẤM ĐỂ TRA CỨU NHANH):</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {glossary.map((g) => (
              <button
                key={g.key}
                type="button"
                onMouseEnter={() => setActiveTerm(g)}
                onClick={() => setActiveTerm((prev) => (prev?.key === g.key ? null : g))}
                className={cn(
                  'rounded-xs border px-2.5 py-1 font-mono text-xs transition-colors',
                  activeTerm?.key === g.key
                    ? 'border-defend bg-defend-muted/30 text-defend font-bold'
                    : 'border-line bg-ink-950 text-bone-300 hover:border-line-strong hover:text-bone-100',
                )}
              >
                {g.term}
              </button>
            ))}
          </div>

          {activeTerm && (
            <div className="border border-defend/35 bg-defend-muted/15 p-3.5 text-xs space-y-1 rounded-xs">
              <div className="flex items-center justify-between border-b border-defend/20 pb-1.5">
                <span className="font-mono font-bold text-bone-100">
                  {activeTerm.term} — <span className="text-defend">{activeTerm.vi_short}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTerm(null)}
                  className="font-mono text-[10px] text-bone-500 hover:text-bone-200 uppercase"
                >
                  [ Đóng ]
                </button>
              </div>
              <p className="text-bone-200 leading-relaxed font-sans pt-0.5">
                {activeTerm.definition_vi}
              </p>
              <div className="font-mono text-[11px] text-bone-400">
                Ví dụ: {activeTerm.example_vi}
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="h-96 animate-pulse border border-line bg-ink-900 rounded-xs" />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Danh sách bài học bên trái — Phong cách Hồ sơ thực địa */}
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
                    'w-full border p-3.5 text-left transition-all duration-150 flex items-start gap-3 rounded-xs relative overflow-hidden',
                    isSelected
                      ? 'border-2 border-attack ring-4 ring-attack/40 ring-offset-2 ring-offset-surface bg-surface-subtle shadow-[0_0_24px_rgba(255,90,54,0.45)]'
                      : 'border-line bg-surface-elevated hover:border-line-strong hover:bg-surface-subtle',
                  )}
                >
                  {/* Vành cam chỉ báo bài học đang chọn */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-attack shadow-[0_0_16px_var(--attack)]" />
                  )}

                  <div
                    className={cn(
                      'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xs font-mono text-xs font-bold border transition-all',
                      isDone
                        ? 'border-defend/60 bg-defend-muted/30 text-defend'
                        : isSelected
                          ? 'border-attack bg-attack text-ink-950 shadow-[0_0_8px_var(--attack)]'
                          : 'border-line bg-surface text-bone-400',
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : l.order}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        'font-mono text-[10px] uppercase font-bold tracking-wider',
                        isSelected ? 'text-attack' : 'text-bone-400'
                      )}>
                        {l.badge_label}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-bone-500">
                        <Clock className="h-2.5 w-2.5" />
                        {l.reading_minutes}P
                      </span>
                    </div>
                    <div className={cn(
                      'mt-1 font-display text-sm font-bold leading-snug transition-colors',
                      isSelected ? 'text-bone-100' : 'text-bone-300'
                    )}>
                      {l.title}
                    </div>
                  </div>
                </button>
              )
            })}
          </aside>

          {/* Nội dung bài học + Thử nghiệm + Bài tập */}
          {currentLesson && (
            <div className="lg:col-span-8 space-y-6">
              <article className="border border-line bg-ink-900 p-6 sm:p-8 space-y-6 rounded-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-widest text-attack px-2 py-0.5 border border-attack/30 bg-attack-muted/20 rounded-xs">
                      BÀI {currentLesson.order} / {lessons.length} • {currentLesson.badge_label}
                    </span>
                    <h2 className="mt-2.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-bone-100">
                      {currentLesson.title}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => void markCompleted.mutateAsync(currentLesson.slug)}
                    className={cn(
                      'inline-flex items-center gap-1.5 font-mono text-xs px-3 py-1.5 rounded-xs border transition-colors',
                      completedSlugs.has(currentLesson.slug)
                        ? 'border-defend/60 bg-defend-muted/30 text-defend'
                        : 'border-line text-bone-300 hover:text-bone-100 hover:border-line-strong',
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {completedSlugs.has(currentLesson.slug)
                        ? 'Đã hoàn thành'
                        : 'Đánh dấu hoàn thành'}
                    </span>
                  </button>
                </div>

                {/* Sơ đồ Tương tác đặc thù (Slider v18->v19->v20, Cây DET, Pyramid...) */}
                <InteractiveLessonWidget kind={currentLesson.interactive_widget} />

                {/* Nội dung Markdown */}
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-bone-100 prose-p:text-bone-200 prose-p:leading-relaxed prose-code:font-mono prose-code:text-attack prose-code:before:content-none prose-code:after:content-none prose-code:bg-ink-950 prose-code:px-1.5 prose-code:py-0.5 prose-code:border prose-code:border-line prose-code:rounded-xs">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentLesson.body_md}
                  </ReactMarkdown>
                </div>

                {/* Ô "Thử ngay trên Matrix" — Phong cách Dispatch Tình báo */}
                {currentLesson.try_technique && (
                  <div className="border border-attack/40 bg-ink-950 p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xs">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-attack uppercase tracking-wider">
                        <span>▲ THỬ NGHIỆM TRÊN DỮ LIỆU THẬT // ATT&amp;CK LAB</span>
                      </div>
                      <div className="text-xs text-bone-300 font-sans">
                        Hồ sơ kỹ thuật mẫu:{' '}
                        <strong className="font-mono text-bone-100 font-bold">
                          {currentLesson.try_technique.attack_id} — {currentLesson.try_technique.name}
                        </strong>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0 font-mono">
                      <button
                        type="button"
                        onClick={() =>
                          openTechnique(
                            currentLesson.try_technique!.attack_id,
                            currentLesson.try_technique!.domain,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xs bg-attack text-ink-950 px-3.5 py-2 text-xs font-bold hover:bg-attack/90 transition-colors"
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
                        className="inline-flex items-center gap-1.5 rounded-xs border border-line bg-ink-900 px-3.5 py-2 text-xs font-semibold text-bone-200 hover:text-bone-100 hover:border-line-strong transition-colors"
                      >
                        <Target className="h-3.5 w-3.5" />
                        <span>Xem trên Ma trận</span>
                      </button>
                    </div>
                  </div>
                )}
              </article>

              {/* Mini Quiz cuối bài — Phiếu Đánh Giá Chuyên Ngành */}
              {currentLesson.quiz.length > 0 && (
                <section className="border border-line bg-ink-900 p-6 space-y-4 rounded-xs">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2 font-display text-lg font-bold text-bone-100">
                      <Layers className="h-4 w-4 text-attack" />
                      <span>Bài Tập Lượng Giá Nhanh ({currentLesson.quiz.length} câu)</span>
                    </div>
                    {bestAttempt && (
                      <span className="font-mono text-xs text-defend border border-defend/30 bg-defend-muted/20 px-2.5 py-0.5 rounded-xs">
                        Điểm số gần nhất: {bestAttempt.score}/{bestAttempt.total}
                      </span>
                    )}
                  </div>

                  <div className="space-y-4 font-sans">
                    {currentLesson.quiz.map((q, qIdx) => (
                      <div
                        key={q.id}
                        className="border border-line bg-ink-950 p-4 space-y-3 rounded-xs"
                      >
                        <div className="font-mono text-xs uppercase tracking-wider text-bone-400">
                          CÂU {qIdx + 1} // {q.question}
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
                                  'w-full border px-3.5 py-2.5 text-left text-xs transition-colors rounded-xs flex items-center justify-between',
                                  quizSubmitted
                                    ? isCorrect
                                      ? 'border-defend bg-defend-muted/25 text-defend font-semibold'
                                      : picked
                                        ? 'border-attack bg-attack-muted/20 text-attack'
                                        : 'border-line opacity-50 text-bone-400'
                                    : picked
                                      ? 'border-attack bg-attack-muted/20 text-bone-100 font-semibold'
                                      : 'border-line bg-ink-900 text-bone-300 hover:border-line-strong hover:text-bone-100',
                                )}
                              >
                                <span>{opt}</span>
                                <span className="font-mono text-[10px] text-bone-500 uppercase">
                                  {picked ? '[ ĐÃ CHỌN ]' : ''}
                                </span>
                              </button>
                            )
                          })}
                        </div>

                        {quizSubmitted && (
                          <div className="border border-defend/30 bg-defend-muted/10 p-3 text-xs text-bone-200 rounded-xs font-sans">
                            <strong className="font-mono text-defend">GIẢI THÍCH:</strong> {q.explanation_vi}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-line">
                    {quizSubmitted ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAnswers({})
                          setQuizSubmitted(false)
                        }}
                        className="inline-flex items-center gap-1.5 font-mono text-xs border border-line px-3.5 py-2 text-bone-300 hover:text-bone-100 hover:border-line-strong rounded-xs transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Làm lại bài kiểm tra</span>
                      </button>
                    ) : (
                      <span className="font-mono text-[11px] text-bone-500">
                        Chọn đáp án cho toàn bộ câu hỏi trước khi nộp bài.
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
                        className="font-mono text-xs font-bold bg-defend text-ink-950 px-4 py-2 rounded-xs hover:bg-defend/90 disabled:opacity-40 transition-colors"
                      >
                        {submitQuiz.isPending ? 'Đang lưu kết quả...' : 'Chấm điểm & Xác nhận bài'}
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
