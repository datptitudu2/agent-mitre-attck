import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toPng } from 'html-to-image'
import {
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { getTacticMeta } from '@/lib/tacticTheme'
import type { AttackDomain, CaseStudyDetail } from '@/lib/types'
import { cn } from '@/lib/utils'
import { renderStixText } from '@/lib/stixRenderer'
import { useUiStore } from '@/stores/useUiStore'

export type PerspectiveMode = 'attacker' | 'defender'

interface AttackChainPlayerProps {
  caseDetail: CaseStudyDetail
}

function wrapTechniqueName(name: string, maxLen = 22): [string, string | null] {
  if (!name || name.length <= maxLen) return [name || '', null]
  const words = name.split(' ')
  if (words.length <= 1) {
    return [name.slice(0, maxLen), name.slice(maxLen)]
  }
  let line1 = ''
  let line2 = ''
  for (const word of words) {
    if (!line1) {
      line1 = word
    } else if ((line1 + ' ' + word).length <= maxLen && !line2) {
      line1 += ' ' + word
    } else {
      line2 = line2 ? line2 + ' ' + word : word
    }
  }
  return [line1, line2 || null]
}

export function AttackChainPlayer({ caseDetail }: AttackChainPlayerProps) {
  const openTechnique = useUiStore((s) => s.openTechnique)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [perspective, setPerspective] = useState<PerspectiveMode>('attacker')
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1)
  const [isPausedByHover, setIsPausedByHover] = useState(false)
  const [exportToast, setExportToast] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [expandedAnalytics, setExpandedAnalytics] = useState<Record<string, boolean>>({})

  const stageRef = useRef<HTMLDivElement | null>(null)
  const captureRef = useRef<HTMLDivElement | null>(null)

  const steps = caseDetail.steps
  const activeStep = steps[activeIndex] ?? steps[0]

  // Reset khi chọn case khác
  useEffect(() => {
    setActiveIndex(0)
    setIsPlaying(false)
    setExpandedSections({})
    setExpandedAnalytics({})
  }, [caseDetail.slug])

  // Phím tắt điều khiển bàn phím (Space, ArrowLeft, ArrowRight, R, A, D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua nếu đang gõ trong input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      if (e.code === 'Space') {
        e.preventDefault()
        setIsPlaying((p) => !p)
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(0, prev - 1))
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        setActiveIndex((prev) => Math.min(steps.length - 1, prev + 1))
      } else if (e.code === 'KeyR') {
        e.preventDefault()
        setActiveIndex(0)
        setIsPlaying(false)
      } else if (e.code === 'KeyA') {
        setPerspective('attacker')
      } else if (e.code === 'KeyD') {
        setPerspective('defender')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [steps.length])

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || isPausedByHover || steps.length <= 1) return

    // Độ trễ tỉ lệ theo độ dài mô tả (trung bình ~5-6s ở tốc độ 1x)
    const baseDuration = Math.min(8000, Math.max(4500, (activeStep.plain_vi?.length ?? 100) * 25))
    const timerDelay = baseDuration / speed

    const timer = setTimeout(() => {
      setActiveIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, timerDelay)

    return () => clearTimeout(timer)
  }, [isPlaying, isPausedByHover, activeIndex, speed, steps.length, activeStep])

  const handleSelectIndex = useCallback((idx: number) => {
    setIsPlaying(false)
    setActiveIndex(idx)
  }, [])

  // Xuất PNG sạch
  const handleExportPng = async () => {
    if (!captureRef.current) return
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#0A0C0B',
      })
      const link = document.createElement('a')
      link.download = `${caseDetail.slug}-attack-chain.png`
      link.href = dataUrl
      link.click()
      setExportToast('Đã xuất ảnh PNG bản đồ chuỗi tấn công!')
      setTimeout(() => setExportToast(null), 3000)
    } catch {
      setExportToast('Lỗi khi xuất ảnh PNG.')
      setTimeout(() => setExportToast(null), 3000)
    }
  }

  // Xuất ATT&CK Navigator v4.5 JSON
  const handleExportNavigator = () => {
    const blob = new Blob([JSON.stringify(caseDetail.navigator_layer, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${caseDetail.slug}-navigator-v4.5.json`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    setExportToast('Đã tải tệp JSON chuẩn ATT&CK Navigator v4.5!')
    setTimeout(() => setExportToast(null), 3000)
  }

  // Toạ độ bản đồ tuyến đường (Orthogonal Subway Route)
  const mapGeometry = useMemo(() => {
    const total = steps.length
    const width = 880
    const startX = 70
    const endX = width - 70
    const usableWidth = endX - startX

    return steps.map((step, idx) => {
      const x = startX + (idx / Math.max(1, total - 1)) * usableWidth
      // So le chuẩn nhịp vi mạch: hàng trên y=95, hàng dưới y=175
      const y = idx % 2 === 0 ? 95 : 175
      return {
        step,
        idx,
        x,
        y,
      }
    })
  }, [steps])

  // Khung bao nội dung động (Fit-to-content Bounding Box)
  // Tự động tính toán toạ độ thực tế của tất cả markers và nhãn, không ghi cứng viewBox
  const stageBox = useMemo(() => {
    if (!mapGeometry.length) {
      return { minX: 0, minY: 0, width: 880, height: 270, viewBox: '0 0 880 270' }
    }
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    mapGeometry.forEach(({ x, y, step, idx }) => {
      const isTop = idx % 2 === 0
      const [, line2] = wrapTechniqueName(step.technique_name, 22)
      const approxTextW = 140

      // Tọa độ bao quanh marker (radius 18px)
      minX = Math.min(minX, x - 18)
      maxX = Math.max(maxX, x + 18)

      // Tọa độ bao quanh nhãn chữ (offset x - 55)
      minX = Math.min(minX, x - 55)
      maxX = Math.max(maxX, x - 55 + approxTextW)

      if (isTop) {
        const topLabelY = y - (line2 ? 68 : 54)
        minY = Math.min(minY, topLabelY - 14)
        maxY = Math.max(maxY, y + 18)
      } else {
        const bottomLabelY = y + 22 + (line2 ? 42 : 28)
        minY = Math.min(minY, y - 18)
        maxY = Math.max(maxY, bottomLabelY + 14)
      }
    })

    const padX = 24
    const padY = 16
    const calcMinX = Math.max(0, Math.floor(minX - padX))
    const calcMinY = Math.max(0, Math.floor(minY - padY))
    const calcWidth = Math.ceil(maxX - minX + padX * 2)
    const calcHeight = Math.ceil(maxY - minY + padY * 2)

    return {
      minX: calcMinX,
      minY: calcMinY,
      width: Math.max(760, calcWidth),
      height: Math.max(240, calcHeight),
      viewBox: `${calcMinX} ${calcMinY} ${Math.max(760, calcWidth)} ${Math.max(240, calcHeight)}`,
    }
  }, [mapGeometry])

  const parsedProcedure = useMemo(
    () => renderStixText(activeStep.mitre_procedure ?? ''),
    [activeStep.mitre_procedure],
  )

  const activeTacticMeta = getTacticMeta(activeStep.tactic_shortname)

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleAnalytic = (id: string) => {
    setExpandedAnalytics((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Xác định trạng thái mở rộng mặc định theo góc nhìn
  const isSectionOpen = (sectionId: string) => {
    if (expandedSections[sectionId] !== undefined) {
      return expandedSections[sectionId]
    }
    if (perspective === 'attacker') {
      return sectionId === '01' || sectionId === '02' || sectionId === '05'
    } else {
      return sectionId === '03' || sectionId === '04' || sectionId === '05'
    }
  }

  return (
    <div
      ref={captureRef}
      className="space-y-6 text-bone-100 font-sans"
      tabIndex={0}
      aria-label="Interactive Attack Chain Player"
    >
      {/* 1. KHỐI TIÊU ĐỀ CASE ĐANG CHỌN (1 dòng Mono + Tiêu đề Serif + Segmented Control) */}
      <div className="border-b border-line pb-6 space-y-3">
        {/* Dòng metadata 1 dòng mono */}
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-wider text-bone-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-attack font-bold">
              {caseDetail.entity?.attack_id ?? caseDetail.source_type}
            </span>
            <span>·</span>
            <span>{caseDetail.domain.toUpperCase()} v{caseDetail.attack_version}</span>
            <span>·</span>
            <span>{caseDetail.year_label}</span>
            <span>·</span>
            <span>MỨC ĐỘ {caseDetail.difficulty.toUpperCase()}</span>
            {caseDetail.is_hypothetical && (
              <>
                <span>·</span>
                <span className="text-caution font-semibold">GIẢ ĐỊNH HỌC TẬP</span>
              </>
            )}
          </div>

          {/* Xuất file dạng link chữ */}
          <div className="flex items-center gap-4 font-mono text-xs">
            <button
              type="button"
              onClick={() => void handleExportPng()}
              className="text-bone-400 hover:text-bone-100 underline decoration-line hover:decoration-bone-300 inline-flex items-center gap-1 transition-colors"
            >
              <span>Xuất PNG</span>
              <span className="text-[10px]">↗</span>
            </button>
            <button
              type="button"
              onClick={handleExportNavigator}
              className="text-bone-400 hover:text-bone-100 underline decoration-line hover:decoration-bone-300 inline-flex items-center gap-1 transition-colors"
            >
              <span>Navigator Layer</span>
              <span className="text-[10px]">↗</span>
            </button>
          </div>
        </div>

        {/* Tiêu đề & Subtitle & Segmented Control */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between pt-1">
          <div className="space-y-1.5 max-w-3xl">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-bone-100 leading-tight">
              {caseDetail.title}
            </h2>
            <p className="font-sans text-xs sm:text-sm text-bone-300 leading-relaxed">
              {caseDetail.subtitle}
            </p>
          </div>

          {/* Segmented control: Attacker ⇄ Defender với chỉ báo trượt spring */}
          <div className="shrink-0 flex items-center">
            <div
              role="group"
              aria-label="Chọn góc nhìn Attacker hoặc Defender"
              className="relative inline-flex border border-line bg-ink-950 p-1 rounded-xs"
            >
              <button
                type="button"
                onClick={() => setPerspective('attacker')}
                className={cn(
                  'relative z-10 px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 rounded-xs',
                  perspective === 'attacker' ? 'text-ink-950' : 'text-bone-400 hover:text-bone-100',
                )}
              >
                <span>▲</span>
                <span>ATTACKER</span>
              </button>

              <button
                type="button"
                onClick={() => setPerspective('defender')}
                className={cn(
                  'relative z-10 px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors flex items-center gap-1.5 rounded-xs',
                  perspective === 'defender' ? 'text-ink-950' : 'text-bone-400 hover:text-bone-100',
                )}
              >
                <span>❖</span>
                <span>DEFENDER</span>
              </button>

              {/* Chỉ báo trượt bằng Spring */}
              <motion.div
                layoutId="perspective-indicator"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(
                  'absolute inset-y-1 rounded-xs',
                  perspective === 'attacker'
                    ? 'left-1 w-[calc(50%-4px)] bg-attack'
                    : 'left-[calc(50%+2px)] w-[calc(50%-4px)] bg-defend',
                )}
              />
            </div>
          </div>
        </div>

        {exportToast && (
          <div className="border border-defend/40 bg-defend-muted/20 px-4 py-1.5 font-mono text-xs text-defend rounded-xs">
            {exportToast}
          </div>
        )}
      </div>

      {/* 2. KHÔNG GIAN CHÍNH: 65% STAGE BẢN ĐỒ (STICKY) + 35% CỘT CHÚ GIẢI */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 items-start">
        {/* STAGE BẢN ĐỒ TUYẾN ĐƯỜNG (XL:COL-SPAN-7 HOẶC 8) */}
        <div className="xl:col-span-7 xl:sticky xl:top-20 space-y-4">
          <div className="border border-line bg-ink-950 rounded-xs overflow-hidden relative">
            {/* Thước Tactic (Sticky trên cùng của stage) */}
            <div className="border-b border-line px-4 py-2 flex items-center gap-3 overflow-x-auto select-none bg-ink-900/60 font-mono text-[10px] tracking-widest text-bone-500">
              <span className="text-bone-600 font-bold shrink-0">TACTIC RULER //</span>
              {steps.map((s, idx) => {
                const isActive = idx === activeIndex
                const meta = getTacticMeta(s.tactic_shortname)
                return (
                  <div
                    key={s.step_order}
                    className={cn(
                      'shrink-0 flex items-center gap-1.5 transition-colors',
                      isActive
                        ? perspective === 'attacker'
                          ? 'text-attack font-bold'
                          : 'text-defend font-bold'
                        : 'text-bone-500',
                    )}
                  >
                    <span>{String(idx + 1).padStart(2, '0')}</span>
                    <span className="uppercase">{meta.viTitle}</span>
                    {idx < steps.length - 1 && <span className="text-line-strong">··</span>}
                  </div>
                )
              })}
            </div>

            {/* Canvas Tuyến đường Đồ thị SVG (Fit-to-content động, không ghi cứng viewBox) */}
            <div
              ref={stageRef}
              style={{ minHeight: `${stageBox.height}px` }}
              className="relative w-full overflow-x-auto select-none bg-surface"
            >
              <div className="min-w-[760px] md:min-w-full h-full relative">
                {/* Lưới toạ độ hairline 32px */}
                <svg className="absolute inset-0 h-full w-full opacity-60 pointer-events-none">
                  <defs>
                    <pattern id="coord-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                      <path
                        d="M 32 0 L 0 0 0 32"
                        fill="none"
                        stroke="var(--line-subtle)"
                        strokeWidth="1"
                      />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#coord-grid)" />
                </svg>

                {/* Dấu toạ độ góc + */}
                <div className="absolute top-2 left-2 font-mono text-[10px] text-bone-500 pointer-events-none">+</div>
                <div className="absolute top-2 right-2 font-mono text-[10px] text-bone-500 pointer-events-none">+</div>
                <div className="absolute bottom-2 left-2 font-mono text-[10px] text-bone-500 pointer-events-none">+</div>
                <div className="absolute bottom-2 right-2 font-mono text-[10px] text-bone-500 pointer-events-none">+</div>

                {/* Tuyến đường SVG Orthogonal Subway Route với viewBox tính toán động */}
                <svg
                  viewBox={stageBox.viewBox}
                  preserveAspectRatio="xMidYMid meet"
                  className="w-full h-full relative z-10"
                >
                  {/* 1. Các đoạn tuyến kết nối (Orthogonal edges) */}
                  {mapGeometry.slice(0, -1).map((curr, idx) => {
                    const next = mapGeometry[idx + 1]
                    const isPassed = idx < activeIndex
                    const isCurrentDrawing = idx === activeIndex - 1
                    const midX = (curr.x + next.x) / 2

                    // Đường ống vuông góc với bo góc 4px
                    const pathData = `M ${curr.x} ${curr.y} L ${midX} ${curr.y} L ${midX} ${next.y} L ${next.x} ${next.y}`
                    const activeColor = perspective === 'attacker' ? 'var(--attack)' : 'var(--defend)'

                    return (
                      <g key={`route-${curr.idx}-${next.idx}`}>
                        {/* Đường nền mờ nét đứt (chưa đi tới) — Sử dụng var(--line-strong) tương thích theme */}
                        <path
                          d={pathData}
                          fill="none"
                          stroke="var(--line-strong)"
                          strokeWidth="1.5"
                          strokeDasharray={isPassed ? undefined : '4 4'}
                        />

                        {/* Đoạn đã đi hoặc đang kích hoạt */}
                        {(isPassed || isCurrentDrawing) && (
                          <motion.path
                            d={pathData}
                            fill="none"
                            stroke={activeColor}
                            strokeWidth="2.5"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                          />
                        )}

                        {/* Xung photon ánh sáng chạy dọc khi chuyển bước */}
                        {isCurrentDrawing && (
                          <motion.circle
                            r="4"
                            fill={activeColor}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0] }}
                            transition={{ duration: 0.6 }}
                          >
                            <animateMotion path={pathData} dur="0.6s" repeatCount="1" />
                          </motion.circle>
                        )}
                      </g>
                    )
                  })}

                  {/* 2. Các Markers & Nhãn chữ treo bên cạnh */}
                  {mapGeometry.map(({ step, idx, x, y }) => {
                    const isActive = idx === activeIndex
                    const isPassed = idx < activeIndex
                    const signalColor = perspective === 'attacker' ? 'var(--attack)' : 'var(--defend)'
                    const mutedSignal = perspective === 'attacker' ? 'var(--attack-muted)' : 'var(--defend-muted)'
                    const [line1, line2] = wrapTechniqueName(step.technique_name, 22)
                    const isTop = idx % 2 === 0
                    const labelYOffset = isTop ? (line2 ? -66 : -52) : 22

                    return (
                      <g
                        key={`marker-${step.step_order}`}
                        onClick={() => handleSelectIndex(idx)}
                        className="cursor-pointer group"
                      >
                        {/* Vòng xung thu hẹp khi kích hoạt bước (Ring contract 1.6 -> 1.0) */}
                        {isActive && (
                          <motion.circle
                            cx={x}
                            cy={y}
                            r="18"
                            fill="none"
                            stroke={signalColor}
                            strokeWidth="1.5"
                            initial={{ scale: 1.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 0.8 }}
                            transition={{ duration: 0.4 }}
                          />
                        )}

                        {/* Khối Marker hình vuông 16px sắc nét */}
                        <rect
                          x={x - 8}
                          y={y - 8}
                          width="16"
                          height="16"
                          rx="2"
                          fill={isActive ? signalColor : isPassed ? mutedSignal : 'var(--ink-900)'}
                          stroke={isActive ? signalColor : isPassed ? signalColor : 'var(--line-strong)'}
                          strokeWidth="1.5"
                          className="transition-colors"
                        />

                        {/* Số thứ tự bước bên trong marker */}
                        <text
                          x={x}
                          y={y + 3.5}
                          textAnchor="middle"
                          fontSize="9"
                          fontFamily="IBM Plex Mono, monospace"
                          fontWeight="bold"
                          fill={isActive ? 'var(--ink-950)' : 'var(--bone-100)'}
                        >
                          {step.step_order}
                        </text>

                        {/* Nhãn chữ treo cạnh marker: 2 dòng đầy đủ, không cắt cụt, Be Vietnam Pro >= 12px */}
                        <g transform={`translate(${x - 55}, ${y + labelYOffset})`}>
                          {/* Dòng 1: ID Technique */}
                          <text
                            x="0"
                            y="0"
                            fontSize="10"
                            fontFamily="IBM Plex Mono, monospace"
                            fill={isActive ? signalColor : 'var(--bone-500)'}
                            fontWeight={isActive ? 'bold' : 'normal'}
                          >
                            {step.attack_id}
                          </text>

                          {/* Dòng 2 & 3: Tên Technique (Ngắt dòng thông minh, tuyệt đối không cắt ...) */}
                          <text
                            x="0"
                            y="14"
                            fontSize="12"
                            fontFamily="Be Vietnam Pro, sans-serif"
                            fontWeight="bold"
                            fill={isActive ? 'var(--bone-100)' : 'var(--bone-300)'}
                            className="group-hover:fill-current transition-colors"
                          >
                            {line1}
                          </text>
                          {line2 && (
                            <text
                              x="0"
                              y="27"
                              fontSize="12"
                              fontFamily="Be Vietnam Pro, sans-serif"
                              fontWeight="bold"
                              fill={isActive ? 'var(--bone-100)' : 'var(--bone-300)'}
                              className="group-hover:fill-current transition-colors"
                            >
                              {line2}
                            </text>
                          )}

                          {/* Tactic Mono */}
                          <text
                            x="0"
                            y={line2 ? 40 : 27}
                            fontSize="9"
                            fontFamily="IBM Plex Mono, monospace"
                            fill="var(--bone-500)"
                            letterSpacing="0.05em"
                          >
                            {step.tactic_shortname.toUpperCase()}
                          </text>
                        </g>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>

            {/* 3. THANH ĐIỀU KHIỂN SCRUBBER TRUNG TÂM */}
            <div className="border-t border-line bg-ink-900 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {/* Nút bấm ô vuông hairline 36px radius 2px */}
              <div className="flex items-center gap-1.5 font-mono">
                <button
                  type="button"
                  disabled={activeIndex === 0}
                  onClick={() => handleSelectIndex(Math.max(0, activeIndex - 1))}
                  title="Bước trước (Phím ←)"
                  aria-label="Bước trước"
                  className="h-9 w-9 rounded-xs border border-line bg-ink-950 flex items-center justify-center text-bone-300 hover:text-bone-100 hover:border-line-strong disabled:opacity-30 transition-colors"
                >
                  <SkipBack className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (activeIndex >= steps.length - 1 && !isPlaying) {
                      setActiveIndex(0)
                    }
                    setIsPlaying((p) => !p)
                  }}
                  title={isPlaying ? 'Tạm dừng (Phím Space)' : 'Phát tự động (Phím Space)'}
                  aria-label={isPlaying ? 'Tạm dừng phát' : 'Phát tự động'}
                  className={cn(
                    'h-9 w-9 rounded-xs border flex items-center justify-center font-bold transition-colors',
                    isPlaying
                      ? 'border-attack bg-attack text-ink-950'
                      : 'border-line bg-ink-950 text-bone-100 hover:border-line-strong hover:bg-ink-800',
                  )}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                </button>

                <button
                  type="button"
                  disabled={activeIndex >= steps.length - 1}
                  onClick={() => handleSelectIndex(Math.min(steps.length - 1, activeIndex + 1))}
                  title="Bước kế (Phím →)"
                  aria-label="Bước kế tiếp"
                  className="h-9 w-9 rounded-xs border border-line bg-ink-950 flex items-center justify-center text-bone-300 hover:text-bone-100 hover:border-line-strong disabled:opacity-30 transition-colors"
                >
                  <SkipForward className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectIndex(0)}
                  title="Quay về đầu (Phím R)"
                  aria-label="Quay về bước 1"
                  className="h-9 w-9 rounded-xs border border-line bg-ink-950 flex items-center justify-center text-bone-400 hover:text-bone-100 hover:border-line-strong transition-colors ml-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>

                {/* Tốc độ phát */}
                <div className="ml-2 flex items-center border border-line rounded-xs text-[10px] overflow-hidden">
                  {([0.5, 1, 2] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={cn(
                        'px-2 py-1.5 transition-colors',
                        speed === s
                          ? 'bg-ink-700 text-bone-100 font-bold'
                          : 'text-bone-500 hover:text-bone-200',
                      )}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrubber ngang với các mốc tick */}
              <div className="flex-1 max-w-md px-2 flex items-center gap-3">
                <div className="relative w-full py-2 flex items-center">
                  {/* Đường kẻ track hairline */}
                  <div className="absolute inset-x-0 h-0.5 bg-line-strong" />

                  {/* Tiến độ đã chạy */}
                  <div
                    className={cn(
                      'absolute left-0 h-0.5 transition-all',
                      perspective === 'attacker' ? 'bg-attack' : 'bg-defend',
                    )}
                    style={{ width: `${(activeIndex / Math.max(1, steps.length - 1)) * 100}%` }}
                  />

                  {/* Từng tick mốc bước */}
                  <div className="relative z-10 w-full flex justify-between items-center">
                    {steps.map((s, idx) => {
                      const isPast = idx <= activeIndex
                      const isCurrent = idx === activeIndex
                      return (
                        <button
                          key={s.step_order}
                          type="button"
                          onClick={() => handleSelectIndex(idx)}
                          title={`Bước ${s.step_order}: ${s.technique_name} (${s.attack_id})`}
                          className="group relative flex flex-col items-center focus:outline-none"
                        >
                          <span
                            className={cn(
                              'h-3 w-3 rounded-full border transition-all flex items-center justify-center',
                              isCurrent
                                ? perspective === 'attacker'
                                  ? 'border-attack bg-attack scale-125'
                                  : 'border-defend bg-defend scale-125'
                                : isPast
                                  ? 'border-bone-300 bg-ink-950'
                                  : 'border-line-strong bg-ink-950 group-hover:border-bone-400',
                            )}
                          />
                          <span
                            className={cn(
                              'absolute -bottom-4 font-mono text-[9px] transition-colors',
                              isCurrent ? 'text-bone-100 font-bold' : 'text-bone-500',
                            )}
                          >
                            0{s.step_order}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT CHÚ GIẢI (ANNOTATION COLUMN) — 35% CHIỀU RỘNG, CUỘN RIÊNG */}
        <div
          onMouseEnter={() => setIsPausedByHover(true)}
          onMouseLeave={() => setIsPausedByHover(false)}
          className="xl:col-span-5 space-y-5"
        >
          {/* Đầu cột: Số bước khổng lồ + Tiêu đề bước Newsreader */}
          <div className="border-b border-line pb-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="font-display text-5xl font-bold tracking-tight text-bone-100 tabular-nums">
                  0{activeStep.step_order}
                </span>
                <span className="font-mono text-sm text-bone-500 ml-2">/ 0{steps.length}</span>
              </div>
              <span className="font-mono text-xs uppercase tracking-wider text-bone-400 px-2 py-0.5 border border-line rounded-xs">
                {activeTacticMeta.viTitle}
              </span>
            </div>

            <h3 className="font-display text-2xl font-bold text-bone-100 leading-snug">
              {activeStep.stage_title_vi}
            </h3>

            <div className="flex items-center gap-2 pt-1 font-mono text-xs">
              <button
                type="button"
                onClick={() =>
                  openTechnique(activeStep.attack_id, caseDetail.domain as AttackDomain)
                }
                className={cn(
                  'px-2 py-0.5 rounded-xs inline-flex items-center gap-1.5 transition-colors font-bold border',
                  perspective === 'attacker'
                    ? 'text-attack hover:text-attack/80 border-attack/30 bg-attack-muted/20'
                    : 'text-defend hover:text-defend/80 border-defend/30 bg-defend-muted/20',
                )}
              >
                <span>{activeStep.attack_id} · {activeStep.technique_name}</span>
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* CÁC MỤC ĐÁNH SỐ HAIRLINE (Góc nhìn Attacker mở 01-02, Defender mở 03-04) */}
          <div className="space-y-4 font-sans text-xs">
            {/* MỤC 01: KẺ TẤN CÔNG LÀM GÌ (Vạch 2px --attack) */}
            <div className="border-l-2 border-l-attack pl-3.5 py-0.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-bone-300">
                  01 KẺ TẤN CÔNG LÀM GÌ // ADVERSARY ACTION
                </span>
                <button
                  type="button"
                  onClick={() => toggleSection('01')}
                  className="font-mono text-[10px] text-bone-500 hover:text-bone-200"
                >
                  {isSectionOpen('01') ? '[ THU GỌN ]' : '[ MỞ RỘNG ]'}
                </button>
              </div>

              {isSectionOpen('01') ? (
                <p className="text-bone-200 leading-relaxed font-sans text-xs sm:text-sm max-w-prose">
                  {activeStep.plain_vi}
                </p>
              ) : (
                <p className="text-bone-400 italic line-clamp-1">
                  {activeStep.plain_vi}
                </p>
              )}
            </div>

            {/* MỤC 02: DẤU VẾT ĐỂ LẠI (TELEMETRY) */}
            <div className="border-l-2 border-l-attack/70 pl-3.5 py-0.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-bone-300">
                  02 DẤU VẾT ĐỂ LẠI // TELEMETRY SIGNALS
                </span>
                <button
                  type="button"
                  onClick={() => toggleSection('02')}
                  className="font-mono text-[10px] text-bone-500 hover:text-bone-200"
                >
                  {isSectionOpen('02') ? '[ THU GỌN ]' : '[ MỞ RỘNG ]'}
                </button>
              </div>

              {isSectionOpen('02') ? (
                <p className="text-bone-200 leading-relaxed font-sans text-xs sm:text-sm max-w-prose">
                  {activeStep.telemetry_vi}
                </p>
              ) : (
                <p className="text-bone-400 italic line-clamp-1">
                  {activeStep.telemetry_vi}
                </p>
              )}
            </div>

            {/* MỤC 03: CÁCH PHÁT HIỆN CHUẨN v18+ (Vạch 2px --defend) */}
            <div className="border-l-2 border-l-defend pl-3.5 py-0.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-defend">
                    03 CÁCH PHÁT HIỆN // DETECTION STRATEGY
                  </span>
                  <span className="font-mono text-[10px] text-bone-500">
                    ({activeStep.detection_strategies.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSection('03')}
                  className="font-mono text-[10px] text-bone-500 hover:text-bone-200"
                >
                  {isSectionOpen('03') ? '[ THU GỌN ]' : '[ MỞ RỘNG ]'}
                </button>
              </div>

              {isSectionOpen('03') ? (
                activeStep.detection_strategies.length === 0 ? (
                  <p className="text-bone-400 italic">
                    Bước này diễn ra ngoài phạm vi thu thập telemetry nội bộ hoặc chưa có Detection Strategy riêng trong STIX 2.1.
                  </p>
                ) : (
                  <div className="space-y-3 pt-1">
                    {activeStep.detection_strategies.map((det) => (
                      <div key={det.attack_id} className="border border-line bg-ink-950 p-3 rounded-xs space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-mono text-xs font-bold text-bone-100">
                            <span className="text-defend mr-1.5">{det.attack_id}</span>
                            <span>{det.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              openTechnique(activeStep.attack_id, caseDetail.domain as AttackDomain)
                            }
                            className="font-mono text-[10px] text-defend hover:underline shrink-0"
                          >
                            Toàn bộ cây DET →
                          </button>
                        </div>

                        {/* Nhánh con Analytic -> Data Component */}
                        <div className="space-y-2 pl-3 border-l border-line">
                          {det.analytics.map((an) => {
                            const isExpanded = expandedAnalytics[an.attack_id]
                            return (
                              <div key={an.attack_id} className="space-y-1">
                                <div className="text-[11px] text-bone-200">
                                  <span className="font-mono font-bold text-bone-300 mr-1.5">
                                    {an.attack_id}:
                                  </span>
                                  <span>{isExpanded ? an.description : `${an.description.slice(0, 110)}...`}</span>
                                  {an.description.length > 110 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleAnalytic(an.attack_id)}
                                      className="font-mono text-[10px] text-defend ml-1.5 hover:underline"
                                    >
                                      {isExpanded ? '[gọn]' : '[mở rộng]'}
                                    </button>
                                  )}
                                </div>

                                {/* Data Components dạng ngoặc vuông hairline */}
                                {an.log_sources.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {an.log_sources.map((ls, lIdx) => (
                                      <span
                                        key={`${an.attack_id}-${lIdx}`}
                                        className="font-mono text-[10px] text-defend border border-defend/30 bg-defend-muted/15 px-1.5 py-0.5 rounded-xs"
                                      >
                                        [ {ls.data_component_id ? `${ls.data_component_id} ` : ''}{ls.data_component_name ?? ls.name} ]
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-bone-400 italic">
                  {activeStep.detection_strategies[0]?.name ?? 'Chưa có chiến lược phát hiện riêng.'}
                </p>
              )}
            </div>

            {/* MỤC 04: GIẢM THIỂU (Có chỉ số mũ số lượng) */}
            <div className="border-l-2 border-l-defend/70 pl-3.5 py-0.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-defend">
                  04 GIẢM THIỂU // MITIGATIONS <sup>{activeStep.mitigations.length}</sup>
                </span>
                <button
                  type="button"
                  onClick={() => toggleSection('04')}
                  className="font-mono text-[10px] text-bone-500 hover:text-bone-200"
                >
                  {isSectionOpen('04') ? '[ THU GỌN ]' : '[ MỞ RỘNG ]'}
                </button>
              </div>

              {isSectionOpen('04') ? (
                activeStep.mitigations.length === 0 ? (
                  <p className="text-bone-400 italic leading-relaxed font-sans">
                    MITRE chưa gán biện pháp giảm thiểu trực tiếp cho sub-technique này. Khuyến nghị áp dụng biện pháp phòng vệ kiến trúc kế thừa từ Technique cha hoặc phân đoạn mạng kiểm soát quy trình.
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    {activeStep.mitigations.map((m) => (
                      <div key={m.attack_id} className="border border-line bg-ink-950 p-2.5 rounded-xs space-y-1">
                        <div className="font-mono text-xs font-bold text-defend flex items-center gap-1.5">
                          <span>{m.attack_id}</span>
                          <span className="text-bone-200 font-sans font-medium">— {m.name}</span>
                        </div>
                        <p className="text-[11px] text-bone-300 leading-relaxed font-sans">
                          {m.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <p className="text-bone-400 italic">
                  {activeStep.mitigations[0]?.name ?? 'Kiểm soát ở tầng kiến trúc mạng.'}
                </p>
              )}
            </div>

            {/* MỤC 05: NGUỒN MITRE ATT&CK STIX 2.1 (Render Stix sạch không lộ markdown thô) */}
            {activeStep.mitre_procedure && (
              <div className="border-l-2 border-l-line-strong pl-3.5 py-0.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-bone-400">
                    05 NGUỒN GỐC MITRE // ORIGINAL STIX 2.1
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSection('05')}
                    className="font-mono text-[10px] text-bone-500 hover:text-bone-200"
                  >
                    {isSectionOpen('05') ? '[ THU GỌN ]' : '[ MỞ RỘNG ]'}
                  </button>
                </div>

                {isSectionOpen('05') && (
                  <div className="space-y-2.5 pt-1">
                    <div className="border border-line bg-ink-950/80 p-3 rounded-xs text-[11px] leading-relaxed text-bone-300 font-sans">
                      <div className="font-mono text-[10px] text-bone-500 uppercase tracking-widest mb-1.5">
                        NGUYÊN VĂN PROCEDURE STIX 2.1:
                      </div>
                      {parsedProcedure.content}
                    </div>

                    {/* Danh mục tài liệu tham khảo (Citations References) */}
                    {parsedProcedure.citations.length > 0 && (
                      <div className="border-t border-line/50 pt-2 space-y-1 font-mono text-[10px] text-bone-400">
                        <div className="text-bone-500 uppercase font-semibold">Tài liệu trích dẫn:</div>
                        {parsedProcedure.citations.map((c) => (
                          <div key={c.index} className="flex items-start gap-1.5">
                            <span className="text-defend">[{c.index}]</span>
                            <span>{c.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
