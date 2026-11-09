import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toPng } from 'html-to-image'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Database,
  Download,
  ExternalLink,
  FileJson,
  Pause,
  Play,
  Radar,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { getTacticMeta } from '@/lib/tacticTheme'
import type { AttackDomain, CaseStudyDetail, CaseStudyStep } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/useUiStore'

export type PerspectiveMode = 'attacker' | 'defender'

interface StepNodeData extends Record<string, unknown> {
  step: CaseStudyStep
  index: number
  isActive: boolean
  isCompleted: boolean
  perspective: PerspectiveMode
  onSelectIndex: (idx: number) => void
}

function AttackStepNode({ data }: NodeProps<Node<StepNodeData>>) {
  const { step, index, isActive, isCompleted, perspective, onSelectIndex } = data
  const tacticMeta = getTacticMeta(step.tactic_shortname)
  const TacticIcon = tacticMeta.icon

  const activeRingClass =
    perspective === 'attacker'
      ? 'border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.45)] ring-2 ring-rose-500/40'
      : 'border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.45)] ring-2 ring-cyan-500/40'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectIndex(index)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelectIndex(index)
        }
      }}
      aria-label={`Bước ${step.step_order}: ${step.technique_name} (${step.attack_id})`}
      className={cn(
        'w-[248px] rounded-2xl border p-3.5 text-left transition-all duration-300 cursor-pointer select-none',
        'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md',
        isActive
          ? activeRingClass
          : isCompleted
            ? 'border-emerald-500/45 opacity-95'
            : 'border-slate-300 dark:border-slate-700/80 opacity-80 hover:opacity-100',
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-cyan-400"
      />

      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold',
            isActive
              ? perspective === 'attacker'
                ? 'bg-rose-500 text-white'
                : 'bg-cyan-500 text-slate-950'
              : isCompleted
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
          )}
        >
          {isCompleted && !isActive && <Check className="h-2.5 w-2.5" />}
          Bước {step.step_order}
        </span>

        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium truncate max-w-[145px]',
            tacticMeta.badgeClass,
          )}
        >
          <TacticIcon className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{step.tactic_name}</span>
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
          {step.attack_id}
        </span>
        {step.is_new && (
          <span className="rounded bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-emerald-500">
            NEW
          </span>
        )}
      </div>

      <div className="mt-0.5 font-display text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
        {step.technique_name}
      </div>

      <p className="mt-1.5 text-[11px] leading-snug text-slate-600 dark:text-slate-300 line-clamp-2">
        {step.stage_title_vi}
      </p>

      <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/70 dark:border-slate-800 pt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
        <span>{step.detection_strategies.length} DET</span>
        <span>{step.mitigations.length} Mitigations</span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-900 !bg-violet-400"
      />
    </div>
  )
}

const nodeTypes = {
  attackStep: AttackStepNode,
}

interface AttackChainPlayerProps {
  caseDetail: CaseStudyDetail
}

export function AttackChainPlayer({ caseDetail }: AttackChainPlayerProps) {
  const openTechnique = useUiStore((s) => s.openTechnique)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [perspective, setPerspective] = useState<PerspectiveMode>('attacker')
  const [exportToast, setExportToast] = useState<string | null>(null)
  const captureRef = useRef<HTMLDivElement | null>(null)

  const steps = caseDetail.steps
  const activeStep = steps[activeIndex] ?? steps[0]

  // Reset khi người dùng chuyển sang Case Study khác
  useEffect(() => {
    setActiveIndex(0)
    setIsPlaying(false)
  }, [caseDetail.slug])

  // Bộ đếm tự động chạy từng bước khi bấm Play
  useEffect(() => {
    if (!isPlaying || steps.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 3000)
    return () => clearInterval(timer)
  }, [isPlaying, steps.length])

  const handleSelectIndex = useCallback((idx: number) => {
    setIsPlaying(false)
    setActiveIndex(idx)
  }, [])

  const nodes: Node<StepNodeData>[] = useMemo(
    () =>
      steps.map((step, idx) => ({
        id: `step-${step.step_order}`,
        type: 'attackStep',
        position: {
          x: idx * 295,
          y: idx % 2 === 0 ? 35 : 105,
        },
        draggable: false,
        data: {
          step,
          index: idx,
          isActive: idx === activeIndex,
          isCompleted: idx < activeIndex,
          perspective,
          onSelectIndex: handleSelectIndex,
        },
      })),
    [steps, activeIndex, perspective, handleSelectIndex],
  )

  const edges: Edge[] = useMemo(() => {
    const activeColor = perspective === 'attacker' ? '#fb7185' : '#22d3ee'
    return steps.slice(0, -1).map((step, idx) => {
      const nextStep = steps[idx + 1]
      const reached = idx < activeIndex
      const isCurrentTransition = idx === activeIndex - 1 || idx === activeIndex
      return {
        id: `edge-${step.step_order}-${nextStep.step_order}`,
        source: `step-${step.step_order}`,
        target: `step-${nextStep.step_order}`,
        animated: reached || idx === activeIndex,
        style: {
          stroke: reached || isCurrentTransition ? activeColor : '#475569',
          strokeWidth: isCurrentTransition ? 3 : 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: reached || isCurrentTransition ? activeColor : '#475569',
        },
      }
    })
  }, [steps, activeIndex, perspective])

  const handleExportPng = async () => {
    if (!captureRef.current) return
    try {
      const dataUrl = await toPng(captureRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#060913',
      })
      const link = document.createElement('a')
      link.download = `${caseDetail.slug}-attack-chain.png`
      link.href = dataUrl
      link.click()
      setExportToast('Đã xuất ảnh PNG chuỗi tấn công!')
      setTimeout(() => setExportToast(null), 2600)
    } catch {
      setExportToast('Không thể kết xuất PNG trên trình duyệt này.')
      setTimeout(() => setExportToast(null), 2600)
    }
  }

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
    setTimeout(() => setExportToast(null), 2600)
  }

  if (!activeStep) return null

  const activeTacticMeta = getTacticMeta(activeStep.tactic_shortname)

  return (
    <div
      ref={captureRef}
      className={cn(
        'rounded-3xl border transition-colors duration-300 overflow-hidden shadow-2xl',
        perspective === 'attacker'
          ? 'border-rose-500/35 bg-white dark:bg-cyber-surface'
          : 'border-cyan-500/40 bg-white dark:bg-cyber-surface',
      )}
    >
      {/* Cảnh báo rõ nếu là Kịch bản Giả định Học tập (vd Case AI v20) */}
      {caseDetail.is_hypothetical && (
        <div className="border-b border-amber-500/40 bg-amber-500/10 px-6 py-3 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <strong>Kịch bản Minh hoạ Học tập (Educational Scenario):</strong>{' '}
            {caseDetail.disclaimer_vi}
          </div>
        </div>
      )}

      {/* Thanh Điều khiển Trên cùng của Player */}
      <div
        className={cn(
          'border-b px-6 py-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between transition-colors',
          perspective === 'attacker'
            ? 'border-rose-500/20 bg-gradient-to-r from-rose-500/10 via-transparent to-transparent'
            : 'border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 via-emerald-500/5 to-transparent',
        )}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
              {caseDetail.domain} • v{caseDetail.attack_version}
            </span>
            {caseDetail.entity && (
              <span className="rounded-lg bg-violet-500/15 border border-violet-500/30 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                MITRE {caseDetail.entity.attack_id}: {caseDetail.entity.name}
              </span>
            )}
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              {caseDetail.year_label} • Mức độ: {caseDetail.difficulty}
            </span>
          </div>
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            {caseDetail.title}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300">{caseDetail.subtitle}</p>
        </div>

        {/* Công tắc Góc nhìn Attacker ⇄ Defender + Xuất file */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div
            role="group"
            aria-label="Chuyển đổi góc nhìn Attacker và Defender"
            className="inline-flex rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-1"
          >
            <button
              type="button"
              onClick={() => setPerspective('attacker')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                perspective === 'attacker'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <Crosshair className="h-3.5 w-3.5" />
              <span>Góc nhìn Attacker</span>
            </button>
            <button
              type="button"
              onClick={() => setPerspective('defender')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all',
                perspective === 'defender'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Góc nhìn Defender</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => void handleExportPng()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-500/50"
          >
            <Download className="h-3.5 w-3.5 text-cyan-500" />
            <span>Xuất ảnh PNG</span>
          </button>

          <button
            type="button"
            onClick={handleExportNavigator}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-violet-500/50"
          >
            <FileJson className="h-3.5 w-3.5 text-violet-500" />
            <span>Xuất Navigator Layer</span>
          </button>
        </div>
      </div>

      {exportToast && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          {exportToast}
        </div>
      )}

      {/* Đồ thị React Flow xếp từ Trái sang Phải */}
      <div
        aria-label={`Đồ thị chuỗi tấn công ${caseDetail.title}`}
        className="relative h-[330px] w-full bg-slate-950/95 border-b border-slate-200 dark:border-slate-800"
      >
        <ReactFlow
          key={caseDetail.slug}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          minZoom={0.35}
          maxZoom={1.5}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1e293b" gap={22} size={1.2} />
          <Controls
            showInteractive={false}
            className="!bg-slate-900/90 !border-slate-700 !rounded-xl overflow-hidden [&>button]:!bg-slate-900 [&>button]:!border-slate-800 [&>button]:!fill-slate-200"
          />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => {
              const nd = n.data as StepNodeData
              if (nd.isActive) return perspective === 'attacker' ? '#f43f5e' : '#06b6d4'
              if (nd.isCompleted) return '#10b981'
              return '#334155'
            }}
            maskColor="rgba(2, 6, 23, 0.72)"
            className="!bg-slate-900/90 !border !border-slate-700 !rounded-xl !h-20 !w-36"
          />
        </ReactFlow>
      </div>

      {/* Thanh Điều khiển Play / Pause / Next / Prev + Timeline Bước */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/70 px-6 py-3.5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (activeIndex >= steps.length - 1 && !isPlaying) {
                setActiveIndex(0)
              }
              setIsPlaying((p) => !p)
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-colors',
              perspective === 'attacker'
                ? 'bg-rose-500 text-white hover:bg-rose-400'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400',
            )}
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? 'Tạm dừng' : 'Chạy tự động (Play)'}</span>
          </button>

          <button
            type="button"
            disabled={activeIndex === 0}
            onClick={() => handleSelectIndex(Math.max(0, activeIndex - 1))}
            aria-label="Bước trước"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Prev</span>
          </button>

          <button
            type="button"
            disabled={activeIndex >= steps.length - 1}
            onClick={() => handleSelectIndex(Math.min(steps.length - 1, activeIndex + 1))}
            aria-label="Bước tiếp theo"
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 disabled:opacity-40"
          >
            <span>Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleSelectIndex(0)}
            title="Quay về Bước 1"
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 text-slate-600 dark:text-slate-300 hover:text-cyan-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Timeline ngang chọn nhanh từng bước */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {steps.map((s, idx) => {
            const active = idx === activeIndex
            return (
              <button
                key={s.step_order}
                type="button"
                onClick={() => handleSelectIndex(idx)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-mono transition-all shrink-0',
                  active
                    ? perspective === 'attacker'
                      ? 'border-rose-500 bg-rose-500/15 text-rose-600 dark:text-rose-300 font-bold'
                      : 'border-cyan-500 bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 font-bold'
                    : idx < activeIndex
                      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-400',
                )}
              >
                <span>#{s.step_order}</span>
                <span>{s.attack_id}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bảng Mổ xẻ Chi tiết Bước Đang chọn (Đổi nội dung & sắc thái theo Attacker / Defender) */}
      <div className="p-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Cột Trái (5/12): Thông tin Kỹ thuật & Diễn giải Bước hiện tại */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-lg px-2.5 py-1 font-mono text-xs font-bold',
                perspective === 'attacker'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/35'
                  : 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/35',
              )}
            >
              Bước {activeStep.step_order} / {steps.length}
            </span>
            <span
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-semibold',
                activeTacticMeta.badgeClass,
              )}
            >
              {activeStep.tactic_name} ({activeTacticMeta.viTitle})
            </span>
          </div>

          <div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              {activeStep.stage_title_vi}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openTechnique(activeStep.attack_id, caseDetail.domain as AttackDomain)
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/40 px-3 py-1.5 font-mono text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/25"
              >
                <span>
                  {activeStep.attack_id} — {activeStep.technique_name}
                </span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {perspective === 'attacker' ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-300">
                  <Crosshair className="h-3.5 w-3.5" />
                  <span>Kẻ tấn công làm gì? (Diễn giải đời thường của Lab)</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                  {activeStep.plain_vi}
                </p>
              </div>

              {activeStep.mitre_procedure && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-1.5">
                  <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Ghi nhận Procedure gốc từ MITRE ATT&amp;CK STIX 2.1
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    {activeStep.mitre_procedure}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl border border-cyan-500/35 bg-cyan-500/5 p-4 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Khuyến nghị Phòng thủ &amp; Săn tìm của ATT&amp;CK Lab</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                  {activeStep.defender_vi}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <Database className="h-3.5 w-3.5" />
                  <span>Dấu hiệu để lại trên hệ thống (Telemetry tín hiệu)</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                  {activeStep.telemetry_vi}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Cột Phải (7/12): Liên kết Trực tiếp Detection Strategy -> Analytic -> Data Component & Mitigations */}
        <div className="lg:col-span-7 space-y-4">
          {perspective === 'attacker' && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-3.5 text-xs text-slate-700 dark:text-slate-300 flex items-start justify-between gap-3">
              <div>
                <strong>Dấu hiệu Telemetry để lại ở bước này:</strong> {activeStep.telemetry_vi}
              </div>
              <button
                type="button"
                onClick={() => setPerspective('defender')}
                className="shrink-0 rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 font-semibold text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/30"
              >
                Lật sang Defender →
              </button>
            </div>
          )}

          {/* Chuỗi Detection Strategy -> Analytic -> Data Component */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-xs font-display font-bold text-slate-900 dark:text-white">
                <Radar className="h-4 w-4 text-violet-500" />
                <span>
                  Cách phát hiện chuẩn v18+ — Detection Strategy → Analytic (
                  {activeStep.detection_strategies.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  openTechnique(activeStep.attack_id, caseDetail.domain as AttackDomain)
                }
                className="text-[11px] font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                Mở toàn bộ cây DET →
              </button>
            </div>

            {activeStep.detection_strategies.length === 0 ? (
              <p className="text-xs text-slate-500">
                Bước này diễn ra ngoài phạm vi giám sát nội bộ hoặc chưa có Detection Strategy riêng.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activeStep.detection_strategies.map((det) => (
                  <div
                    key={det.attack_id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 p-3 space-y-2"
                  >
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      <span className="font-mono text-violet-600 dark:text-violet-400 mr-2">
                        [{det.attack_id}]
                      </span>
                      {det.name}
                    </div>
                    <div className="space-y-1.5 pl-2.5 border-l-2 border-cyan-500/35">
                      {det.analytics.slice(0, 2).map((an) => (
                        <div key={an.attack_id} className="text-[11px] space-y-1">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            <span className="font-mono text-cyan-600 dark:text-cyan-400 mr-1.5">
                              {an.attack_id}:
                            </span>
                            <span className="line-clamp-2">{an.description}</span>
                          </div>
                          {an.log_sources.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {an.log_sources.slice(0, 3).map((ls, i) => (
                                <span
                                  key={`${an.attack_id}-ls-${i}`}
                                  className="rounded bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-300"
                                >
                                  {ls.data_component_id ? `${ls.data_component_id} ` : ''}
                                  {ls.data_component_name ?? ls.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mitigations */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/50 p-4 space-y-2.5">
            <div className="inline-flex items-center gap-2 text-xs font-display font-bold text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Cách giảm thiểu — Mitigations ({activeStep.mitigations.length})</span>
            </div>
            {activeStep.mitigations.length === 0 ? (
              <p className="text-xs text-slate-500">
                MITRE khuyến nghị kiểm soát ở tầng kiến trúc hoặc chính sách vận hành cho bước này.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {activeStep.mitigations.slice(0, 4).map((m) => (
                  <div
                    key={m.attack_id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-2.5 text-[11px]"
                  >
                    <div className="font-semibold text-slate-900 dark:text-white">
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 mr-1.5">
                        {m.attack_id}
                      </span>
                      {m.name}
                    </div>
                    <p className="mt-1 text-slate-600 dark:text-slate-300 line-clamp-2">
                      {m.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
