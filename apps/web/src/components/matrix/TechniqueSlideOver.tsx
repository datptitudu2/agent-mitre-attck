import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bookmark,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Cpu,
  ExternalLink,
  FileCode2,
  Languages,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { getTacticMeta } from '@/lib/tacticTheme'
import type { AnnotatedLogSample, MlFeatureRecipe, SigmaRule, TechniqueDetail } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useTechniqueTranslation } from '@/hooks/useTechniqueTranslation'
import { useBookmarks, useTechniqueNote } from '@/hooks/useUserData'
import { useUiStore } from '@/stores/useUiStore'
import { renderStixText, StixArticleViewer } from '@/lib/stixRenderer'
import { AnnotatedLogReader } from '@/components/telemetry/AnnotatedLogReader'
import { SigmaRuleViewer } from '@/components/detection/SigmaRuleViewer'
import { MlRecipeCard } from '@/components/detection/MlRecipeCard'
import { KnowledgeHovercard } from '@/components/common/KnowledgeHovercard'

// 15 Tactics chuẩn Enterprise v20.1 theo thứ tự chuỗi tấn công (Không cuộn ngang, vừa khít khung)
// ST = Stealth (TA0005 v19+), DI = Defense Impairment (TA0112 v19+)
const ALL_15_TACTICS = [
  { id: 'reconnaissance', short: 'RC', top: 'Trinh', bot: 'sát', isPre: true },
  { id: 'resource-development', short: 'RD', top: 'Tài', bot: 'nguyên', isPre: true },
  { id: 'initial-access', short: 'IA', top: 'Xâm', bot: 'nhập' },
  { id: 'execution', short: 'EX', top: 'Thực', bot: 'thi' },
  { id: 'persistence', short: 'PR', top: 'Duy', bot: 'trì' },
  { id: 'privilege-escalation', short: 'PE', top: 'Leo', bot: 'quyền' },
  { id: 'defense-evasion', short: 'ST', top: 'Ẩn', bot: 'mình', isNewV19: true }, // ST: Stealth
  { id: 'defense-impairment', short: 'DI', top: 'Vô', bot: 'hiệu', isNewV19: true }, // DI: Defense Impairment
  { id: 'credential-access', short: 'CA', top: 'Xác', bot: 'thực' },
  { id: 'discovery', short: 'DS', top: 'Khám', bot: 'phá' },
  { id: 'lateral-movement', short: 'LM', top: 'Ngang', bot: 'hàng' },
  { id: 'collection', short: 'CO', top: 'Thu', bot: 'thập' },
  { id: 'command-and-control', short: 'C2', top: 'Chỉ', bot: 'huy' },
  { id: 'exfiltration', short: 'EF', top: 'Rút', bot: 'tin' },
  { id: 'impact', short: 'IM', top: 'Tác', bot: 'động' },
]

export function TechniqueSlideOver() {
  const { selectedTechnique, openTechnique, closeTechnique } = useUiStore()
  const [activeSection, setActiveSection] = useState<string>('sec-00')
  const [noteDraft, setNoteDraft] = useState('')
  const [noteSavedToast, setNoteSavedToast] = useState(false)
  const [expandedMitigations, setExpandedMitigations] = useState<Record<string, boolean>>({})
  const [expandedAnalytics, setExpandedAnalytics] = useState<Record<string, boolean>>({})
  const [expandedProcedures, setExpandedProcedures] = useState<Record<string, boolean>>({})

  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const attackId = selectedTechnique?.attackId ?? null
  const domainHint = selectedTechnique?.domain

  const { data: detail, isLoading, error } = useQuery({
    queryKey: ['technique-detail', attackId, domainHint],
    enabled: Boolean(attackId),
    queryFn: () =>
      apiFetch<TechniqueDetail>(
        `/api/techniques/${encodeURIComponent(attackId!)}${
          domainHint ? `?domain=${encodeURIComponent(domainHint)}` : ''
        }`,
      ),
  })

  const { bookmarks, toggleBookmark } = useBookmarks()
  const { note, saveNote } = useTechniqueNote(attackId)
  const { isTranslated, isTranslating, toggleTranslate, t } = useTechniqueTranslation(detail)

  // Danh mục nền tảng OS áp dụng (công tắc đổi nội dung telemetry/luật)
  const platforms = useMemo(() => {
    return detail?.platforms && detail.platforms.length > 0
      ? detail.platforms
      : ['Windows', 'Linux', 'macOS']
  }, [detail])
  const [selectedOs, setSelectedOs] = useState<string>('Windows')

  useEffect(() => {
    if (platforms.length > 0 && !platforms.includes(selectedOs)) {
      setSelectedOs(platforms[0])
    }
  }, [platforms, selectedOs])

  const { data: techLogsData } = useQuery({
    queryKey: ['annotated-logs', attackId],
    queryFn: () =>
      apiFetch<{ logs: AnnotatedLogSample[] }>(`/api/telemetry/annotated-logs/${attackId}`),
    enabled: Boolean(attackId),
  })

  const { data: techSigmaData } = useQuery({
    queryKey: ['tech-sigma-rules', attackId],
    queryFn: () =>
      apiFetch<{ rules: SigmaRule[]; total: number }>(`/api/detection/sigma-rules?technique_id=${attackId}`),
    enabled: Boolean(attackId),
  })

  const { data: techMlData } = useQuery({
    queryKey: ['tech-ml-recipes', attackId],
    queryFn: () =>
      apiFetch<{ recipes: MlFeatureRecipe[]; total: number }>(`/api/detection/ml-recipes?technique_id=${attackId}`),
    enabled: Boolean(attackId),
  })


  useEffect(() => {
    setNoteDraft(note?.body_md ?? '')
  }, [note?.body_md, attackId])

  useEffect(() => {
    setExpandedMitigations({})
    setExpandedAnalytics({})
    setExpandedProcedures({})
  }, [attackId])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedTechnique) {
        closeTechnique()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedTechnique, closeTechnique])

  // Scrollspy via IntersectionObserver
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id)
        }
      },
      { root: container, threshold: 0.2 },
    )

    const sections = container.querySelectorAll('[data-dossier-sec]')
    sections.forEach((s) => observer.observe(s))

    return () => observer.disconnect()
  }, [detail])

  const scrollToSec = (secId: string) => {
    const el = document.getElementById(secId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(secId)
    }
  }

  const existingBookmark = detail
    ? bookmarks.find(
        (b) => b.attack_id === detail.attack_id && b.domain === detail.domain,
      )
    : undefined

  const handleSaveNote = async () => {
    await saveNote.mutateAsync(noteDraft)
    setNoteSavedToast(true)
    setTimeout(() => setNoteSavedToast(false), 2000)
  }

  // Phân loại ranh giới phòng thủ: PRE (Ngoài mạng), CROSS-BOUNDARY (Xuyên ranh giới), hay INTERNAL (Nội bộ)
  const boundaryType = useMemo<'pre' | 'cross' | 'internal'>(() => {
    if (!detail) return 'internal'
    const id = detail.attack_id.toUpperCase()
    const tacs = detail.tactics.map((t) => t.toLowerCase())

    // Xuyên ranh giới (Cross-boundary): T1189, Phishing, External Exploit
    if (
      id === 'T1189' ||
      id.startsWith('T1189.') ||
      id.startsWith('T1566') ||
      id === 'T1190'
    ) {
      return 'cross'
    }

    // PRE: Reconnaissance hoặc Resource Development
    if (
      tacs.includes('reconnaissance') ||
      tacs.includes('resource-development') ||
      tacs.includes('pre-attack')
    ) {
      return 'pre'
    }

    return 'internal'
  }, [detail])

  const isPreAttack = boundaryType === 'pre'

  // Phân tích các chặng theo ranh giới mạng (Động từ DB / Backend, không fix cứng)
  const crossStages = useMemo(() => {
    if (detail?.horizon) {
      return {
        stage1: detail.horizon.stage1,
        stage2: detail.horizon.stage2,
        stage3: detail.horizon.stage3,
      }
    }
    return {
      stage1: 'Hạ tầng / Tài nguyên ngoài',
      stage2: 'Xâm nhập qua ranh giới mạng',
      stage3: 'Thực thi mã trên Endpoint',
    }
  }, [detail])

  const tacticalInsight = useMemo(() => {
    if (detail?.tactical_insight) return detail.tactical_insight
    if (detail?.horizon?.insight) return detail.horizon.insight
    if (!detail) return ''
    if (boundaryType === 'pre') {
      return `${detail.name} (${detail.attack_id}) diễn ra hoàn toàn bên ngoài tầm với của firewall và EDR nội bộ. Trọng tâm là đào tạo nhận thức và thu thập Threat Intelligence.`
    }
    if (boundaryType === 'cross') {
      return `${detail.name} (${detail.attack_id}) là kỹ thuật xâm nhập xuyên vành đai: kết hợp kiểm soát tại cổng Gateway và giám sát chặt chẽ thiết bị đầu cuối.`
    }
    return `${detail.name} (${detail.attack_id}) thực thi ngay bên trong hệ thống nội bộ. Đây là vùng kiểm soát chính của EDR/SIEM qua Process Creation và Memory Modification.`
  }, [detail, boundaryType])

  // "Chuỗi 6 mắt xích" — Khung tư duy duy nhất cho MỌI technique
  const sixChainDossier = useMemo(() => {
    if (!detail) {
      return {
        action: '',
        artifact: '',
        logSource: '',
        detection: '',
        mlFeature: '',
        mitigation: '',
      }
    }

    // 1. HÀNH VI
    let action = detail.fast_card?.what || ''
    if (!action) {
      if (detail.description) {
        const clean = detail.description.replace(/\(Citation:[^)]+\)/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        const firstSentence = clean.split(/\.\s+/)[0]?.trim()
        action = firstSentence ? `${firstSentence}.` : `${detail.name} là một kỹ thuật thuộc giai đoạn ${detail.tactics.join(', ')}.`
      } else {
        action = `${detail.name} (${detail.attack_id}) là một kỹ thuật thuộc giai đoạn ${detail.tactics.join(', ')}.`
      }
    }

    // 2. DẤU VẾT & 3. NGUỒN LOG (Trích xuất từ Detection Strategies / Analytics)
    const dcNames = new Set<string>()
    const logChannels = new Set<string>()
    const analyticsList: string[] = []

    for (const det of detail.detection_strategies || []) {
      for (const an of det.analytics || []) {
        analyticsList.push(`[${an.attack_id}] ${an.name}`)
        for (const ls of an.log_sources || []) {
          if (ls.data_component?.name) dcNames.add(ls.data_component.name)
          if (ls.channel) logChannels.add(ls.channel)
          else if (ls.name) logChannels.add(ls.name)
        }
      }
    }

    let artifact = Array.from(dcNames).slice(0, 3).join(', ')
    if (!artifact) {
      artifact = boundaryType === 'pre'
        ? 'Dấu vết trên hạ tầng bên thứ ba, DNS lookup, WHOIS records'
        : boundaryType === 'cross'
          ? 'Network socket connection, URI request, tiến trình con trình duyệt'
          : 'Tiến trình con sinh bất thường, ghi file tạm thời, sửa đổi Registry'
    }

    let logSource = Array.from(logChannels).slice(0, 3).join(' · ')
    if (!logSource) {
      logSource = boundaryType === 'pre'
        ? 'DNS Server log, Web Proxy, Threat Intelligence Feeds'
        : boundaryType === 'cross'
          ? 'Zeek / Network Flow, WinEventLog 4688 / Sysmon EID 1'
          : 'Sysmon EID 1 (Process), EID 7 (ImageLoad), WinSec 4688 / auditd'
    }

    // 4. CÁCH BẮT
    let detection = ''
    if (analyticsList.length > 0) {
      detection = analyticsList[0]
    } else if (detail.detection_strategies.length > 0) {
      detection = `[${detail.detection_strategies[0].attack_id}] ${detail.detection_strategies[0].name}`
    } else {
      detection = `Quy tắc tương quan hành vi giám sát tiến trình và kết nối mạng cho ${detail.attack_id}.`
    }

    // 5. ĐẶC TRƯNG ML
    let mlFeature = ''
    const dcLower = artifact.toLowerCase()
    if (dcLower.includes('process') || dcLower.includes('tiến trình')) {
      mlFeature = 'Tần suất hiếm của cặp tiến trình cha–con, độ dài & entropy của CommandLine, độ sâu cây tiến trình.'
    } else if (dcLower.includes('network') || dcLower.includes('mạng') || boundaryType === 'cross') {
      mlFeature = 'Tần suất kết nối IP/Domain hiếm gặp, độ dài URI, tỷ lệ byte gửi/nhận, khoảng cách beacon.'
    } else if (dcLower.includes('logon') || dcLower.includes('đăng nhập')) {
      mlFeature = 'Tần suất đăng nhập theo khung giờ người dùng, tỷ lệ thất bại đột biến, khoảng cách địa lý IP không tưởng.'
    } else {
      mlFeature = 'Tần suất xuất hiện theo baseline từng máy trạm/server, độ lệch chuẩn so với nhóm người dùng cùng vai trò.'
    }

    // 6. CÁCH CHẶN
    let mitigation = ''
    if (detail.mitigations.length > 0) {
      const topMit = detail.mitigations[0]
      mitigation = `[${topMit.attack_id} ${topMit.name}]: ${topMit.action_vi || topMit.name}`
    } else if (detail.parent) {
      mitigation = `Kế thừa chính sách phòng vệ từ kỹ thuật cha [${detail.parent.attack_id} ${detail.parent.name}].`
    } else {
      mitigation = 'Phân tách quyền tối thiểu (Least Privilege), kiểm soát thực thi ứng dụng (WDAC/AppLocker).'
    }

    return { action, artifact, logSource, detection, mlFeature, mitigation }
  }, [detail, boundaryType])

  // Tính toán dữ liệu Chòm sao d3-force giả lập theo giải thuật lực đàn hồi xác định (Deterministic Force Layout)
  const constellationNodes = useMemo(() => {
    if (!detail) return []
    const rawNodes: Array<{ id: string; name: string; type: 'group' | 'software' | 'campaign'; weight: number }> = []

    for (const g of detail.procedures.groups.slice(0, 16)) {
      rawNodes.push({ id: g.attack_id, name: g.name, type: 'group', weight: 4 })
    }
    for (const s of detail.procedures.software.slice(0, 14)) {
      rawNodes.push({ id: s.attack_id, name: s.name, type: 'software', weight: 3 })
    }
    for (const c of detail.procedures.campaigns.slice(0, 6)) {
      rawNodes.push({ id: c.attack_id, name: c.name, type: 'campaign', weight: 5 })
    }

    // Tính toạ độ hình học phân bổ hình tròn quanh tâm (cx=240, cy=130)
    const cx = 240
    const cy = 130
    const total = rawNodes.length
    if (total === 0) return []

    return rawNodes.map((node, i) => {
      // Phân tầng theo bán kính: Campaign ở gần, Group ở giữa, Software ở ngoài
      let baseR = 75
      if (node.type === 'campaign') baseR = 50
      if (node.type === 'software') baseR = 95

      const angle = (2 * Math.PI * i) / total
      // Thêm độ lệch nhẹ xác định để tránh trùng đường tròn đơn điệu
      const r = baseR + ((i * 17) % 25) - 12
      const x = Math.round(cx + r * Math.cos(angle))
      const y = Math.round(cy + r * 0.75 * Math.sin(angle)) // ellipse dẹp cho vừa khung

      return {
        ...node,
        x,
        y,
      }
    })
  }, [detail])

  // Tính xếp hạng độ phổ biến (ước tính dựa trên tổng số Group + Software sử dụng)
  const popularityInfo = useMemo(() => {
    if (!detail) return { rank: 100, total: 227, dots: 5 }
    const totalUsage = (detail.procedures.groups.length * 2) + detail.procedures.software.length + (detail.procedures.campaigns.length * 3)
    // Tính xếp hạng tương đối trong khoảng 1 đến 227
    let rank = 180
    if (totalUsage >= 40) rank = 8
    else if (totalUsage >= 25) rank = 24
    else if (totalUsage >= 15) rank = 48
    else if (totalUsage >= 8) rank = 82
    else if (totalUsage >= 3) rank = 125

    const activeDots = Math.min(20, Math.max(1, Math.round((228 - rank) / 11.4)))
    return { rank, total: 227, dots: activeDots }
  }, [detail])

  // Danh mục 9 mục dính cho Mini-TOC
  const tocItems = [
    { id: 'sec-00', num: '00', label: 'Chuỗi 6 mắt xích' },
    { id: 'sec-01', num: '01', label: 'Bản chất hành vi' },
    { id: 'sec-02', num: '02', label: 'Thước 15 Tactic' },
    { id: 'sec-03', num: '03', label: 'Ai từng dùng' },
    { id: 'sec-04', num: '04', label: 'Đường chân trời' },
    { id: 'sec-05', num: '05', label: 'Cách bắt (DET)' },
    { id: 'sec-06', num: '06', label: 'Cách chặn' },
    { id: 'sec-07', num: '07', label: 'Nguyên văn STIX' },
    { id: 'sec-08', num: '08', label: 'Ghi nhớ thụ động' },
  ]

  return (
    <AnimatePresence>
      {selectedTechnique && (
        <>
          {/* Nền mờ dịu ~40%, KHÔNG blur theo đúng yêu cầu mục 9 (giữ trọn vẹn ngữ cảnh Ma trận) */}
          <motion.div
            key="tech-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            onClick={closeTechnique}
            className="fixed inset-0 z-50 bg-black/40"
          />

          {/* Ngăn kéo cuộn một mạch — Chiều rộng >= 56%, tối đa 960px, không glow */}
          <motion.aside
            key="tech-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Hồ sơ kỹ thuật ${selectedTechnique.attackId}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%', transition: { duration: 0.14 } }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            className="dossier-drawer fixed inset-y-0 right-0 z-[60] flex w-full lg:w-[62%] max-w-[960px] flex-col bg-surface border-l border-line font-sans"
          >
            {/* 1. Header Cố định: Typography Newsreader Serif, bỏ khung bao quanh chip metadata */}
            <div className="border-b border-line bg-surface-elevated px-6 py-4 shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                    <span className="font-bold text-attack">
                      ▲ {detail?.attack_id ?? selectedTechnique.attackId}
                    </span>
                    <span className="text-bone-500">·</span>
                    <span className="text-bone-400 uppercase">
                      {detail?.domain ?? 'ENTERPRISE-ATTACK'}
                    </span>
                    <span className="text-bone-500">·</span>
                    <span className="text-bone-400">
                      v20.1
                    </span>
                    {isPreAttack && (
                      <>
                        <span className="text-bone-500">·</span>
                        <span
                          className="font-bold text-caution uppercase"
                          title="PRE-ATTACK // Hoạt động trinh sát hoặc chuẩn bị bên ngoài vành đai mạng nội bộ"
                        >
                          PRE-ATTACK
                        </span>
                      </>
                    )}
                    {detail?.parent && (
                      <>
                        <span className="text-bone-500">·</span>
                        <button
                          type="button"
                          onClick={() => openTechnique(detail.parent!.attack_id, detail.domain)}
                          className="text-bone-300 hover:text-bone-100 inline-flex items-center gap-0.5 underline decoration-line-strong transition-colors"
                        >
                          <span>Thuộc {detail.parent.attack_id}</span>
                          <ChevronRight className="h-3 w-3 text-bone-500" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Tiêu đề Newsreader Serif thanh lịch chuẩn DESIGN.md */}
                  <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-bone-100 leading-tight">
                    {detail?.name ?? 'Đang nạp hồ sơ kỹ thuật...'}
                  </h1>

                  {detail && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 font-mono text-[11px] text-bone-400">
                      {detail.tactics.map((tac) => {
                        const meta = getTacticMeta(tac)
                        return (
                          <span key={tac} title={meta.viHint}>
                            {tac} // {meta.viTitle}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Các nút hành động Header */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      detail &&
                      toggleBookmark.mutate({
                        attackId: detail.attack_id,
                        domain: detail.domain,
                        existingId: existingBookmark?.id,
                      })
                    }
                    aria-label="Lưu thẻ ôn tập kỹ thuật này"
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1.5 font-mono text-xs transition-colors',
                      existingBookmark
                        ? 'border-caution text-caution bg-caution/10 font-bold'
                        : 'border-line text-bone-300 hover:text-bone-100',
                    )}
                  >
                    <Bookmark className={cn('h-3.5 w-3.5', existingBookmark && 'fill-current')} />
                    <span className="hidden sm:inline">
                      {existingBookmark ? 'Đã lưu thẻ ôn' : 'Lưu thẻ ôn'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleTranslate}
                    disabled={isTranslating}
                    title="Chuyển đổi Tiếng Việt / Tiếng Anh"
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1.5 font-mono text-xs transition-colors',
                      isTranslated
                        ? 'border-defend bg-defend-muted/30 text-defend font-semibold'
                        : 'border-line text-bone-300 hover:text-bone-100',
                    )}
                  >
                    <Languages className="h-3.5 w-3.5" />
                    <span>{isTranslated ? 'VI' : 'EN'}</span>
                  </button>

                  {detail?.metadata?.url && (
                    <a
                      href={detail.metadata.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Mở tài liệu gốc MITRE ATT&CK"
                      className="rounded-xs border border-line p-1.5 text-bone-300 hover:text-bone-100 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={closeTechnique}
                    aria-label="Đóng bảng chi tiết"
                    className="rounded-xs border border-line p-1.5 text-bone-300 hover:text-bone-100 hover:border-line-strong transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Mục lục dính (Sticky Mini-TOC): Ẩn thanh cuộn, không mũi tên, hiển thị chỉ số 00-08 + tooltip */}
            <nav
              aria-label="Mục lục hồ sơ kỹ thuật"
              className="sticky top-0 z-20 border-b border-line bg-surface/95 px-6 py-2 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden select-none"
            >
              <div className="flex items-center justify-between w-full">
                {tocItems.map(({ id, num, label }) => {
                  const isActive = activeSection === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => scrollToSec(id)}
                      title={`${num} // ${label}`}
                      className={cn(
                        'px-2.5 py-1 font-mono text-xs transition-colors rounded-xs relative group',
                        isActive
                          ? 'text-attack font-bold border-b-2 border-attack'
                          : 'text-bone-400 hover:text-bone-100',
                      )}
                    >
                      <span>{num}</span>
                      {/* Tooltip hiển thị khi hover */}
                      <span className="hidden group-hover:block absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 bg-ink-950 border border-line text-[10px] text-bone-200 whitespace-nowrap z-30 shadow-md">
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </nav>

            {/* 3. Thân Hồ sơ Cuộn một mạch (Single Column Scroll) */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-8 scroll-smooth"
            >
              {isLoading && (
                <div className="p-8 text-center font-mono text-xs text-bone-500 animate-pulse">
                  Đang truy vấn STIX 2.1 Live Repository...
                </div>
              )}

              {error && (
                <div className="border border-attack/40 bg-attack-muted/20 p-4 font-mono text-xs text-attack">
                  LỖI: {error instanceof Error ? error.message : 'Không tải được hồ sơ.'}
                </div>
              )}

              {detail && (
                <>
                  {/* =========================================================
                      00. THẺ NHANH: CHUỖI 6 MẮT XÍCH (KHUNG VIỀN DUY NHẤT)
                     ========================================================= */}
                  <section
                    id="sec-00"
                    data-dossier-sec
                    className="border-2 border-[#FF5A36]/60 bg-surface-elevated p-5 rounded-xs space-y-3.5 relative shadow-[0_0_12px_rgba(255,90,54,0.15)]"
                  >
                    <div className="flex items-center justify-between border-b border-line/60 pb-2">
                      <div className="border border-[#FF5A36] text-[#FF5A36] bg-[#FF5A36]/10 px-2.5 py-1 rounded-xs font-mono text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 shadow-[0_0_8px_rgba(255,90,54,0.25)]">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>THẺ NHANH // CHUỖI 6 MẮT XÍCH ĐỊNH VỊ KỸ THUẬT</span>
                      </div>
                      <span className="font-mono text-[10px] text-bone-500 uppercase">
                        KHUNG TƯ DUY DUY NHẤT
                      </span>
                    </div>

                    <div className="space-y-2.5 font-sans text-xs sm:text-[13px]">
                      {/* 1. Hành vi */}
                      <div className="flex items-start gap-2.5">
                        <span className="border border-[#FF5A36] text-[#FF5A36] bg-[#FF5A36]/15 px-2 py-0.5 rounded-xs font-mono text-[11px] font-bold uppercase tracking-wider shrink-0 select-none shadow-[0_0_6px_rgba(255,90,54,0.2)]">
                          ① Hành vi
                        </span>
                        <div className="text-bone-100 leading-relaxed font-normal pt-0.5">
                          {renderStixText(sixChainDossier.action).content}
                        </div>
                      </div>

                      {/* 2. Dấu vết */}
                      <div className="flex items-start gap-2.5">
                        <span className="border border-[#F2B84B] text-[#F2B84B] bg-[#F2B84B]/15 px-2 py-0.5 rounded-xs font-mono text-[11px] font-bold uppercase tracking-wider shrink-0 select-none shadow-[0_0_6px_rgba(242,184,75,0.2)]">
                          ② Dấu vết
                        </span>
                        <div className="text-bone-200 leading-relaxed font-normal pt-0.5">
                          {renderStixText(sixChainDossier.artifact).content}
                        </div>
                      </div>

                      {/* 3. Nguồn Log */}
                      <div className="flex items-start gap-2.5">
                        <span className="border border-[#6FCFB2] text-[#6FCFB2] bg-[#6FCFB2]/15 px-2 py-0.5 rounded-xs font-mono text-[11px] font-bold uppercase tracking-wider shrink-0 select-none shadow-[0_0_6px_rgba(111,207,178,0.2)]">
                          ③ Nguồn Log
                        </span>
                        <div className="text-bone-200 leading-relaxed font-normal pt-0.5">
                          {renderStixText(sixChainDossier.logSource).content}
                        </div>
                      </div>

                      {/* 4. Cách bắt */}
                      <div className="flex items-start gap-2.5">
                        <span className="border border-[#6FCFB2] text-[#6FCFB2] bg-[#6FCFB2]/15 px-2 py-0.5 rounded-xs font-mono text-[11px] font-bold uppercase tracking-wider shrink-0 select-none shadow-[0_0_6px_rgba(111,207,178,0.2)]">
                          ④ Cách bắt
                        </span>
                        <div className="text-bone-200 leading-relaxed font-normal pt-0.5">
                          {renderStixText(sixChainDossier.detection).content}
                          {techSigmaData?.rules && techSigmaData.rules.length > 0 && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-xs bg-signal-amber/15 text-signal-amber border border-signal-amber/30 font-bold ml-2">
                              <FileCode2 className="h-3 w-3" />
                              {techSigmaData.rules.length} LUẬT SIGMAHQ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 5. Đặc trưng ML */}
                      <div className="flex items-start gap-2.5">
                        <span className="border border-[#FF5A36] text-[#FF5A36] bg-[#FF5A36]/15 px-2 py-0.5 rounded-xs font-mono text-[11px] font-bold uppercase tracking-wider shrink-0 select-none shadow-[0_0_6px_rgba(255,90,54,0.2)]">
                          ⑤ Đặc trưng ML
                        </span>
                        <div className="text-bone-200 leading-relaxed font-normal pt-0.5">
                          {renderStixText(sixChainDossier.mlFeature).content}
                          {techMlData?.recipes && techMlData.recipes.length > 0 && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-xs bg-signal-teal/15 text-signal-teal border border-signal-teal/30 font-bold ml-2">
                              <Cpu className="h-3 w-3" />
                              {techMlData.recipes.length} CÔNG THỨC ML
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 6. Cách chặn */}
                      <div className="flex items-start gap-2.5">
                        <span className="border border-[#F2B84B] text-[#F2B84B] bg-[#F2B84B]/15 px-2 py-0.5 rounded-xs font-mono text-[11px] font-bold uppercase tracking-wider shrink-0 select-none shadow-[0_0_6px_rgba(242,184,75,0.2)]">
                          ⑥ Cách chặn
                        </span>
                        <div className="text-bone-200 leading-relaxed font-normal pt-0.5">
                          {renderStixText(sixChainDossier.mitigation).content}
                        </div>
                      </div>

                      {/* Mẫu Log thực chiến có chú giải (Annotated Log Reader) */}
                      {techLogsData?.logs && techLogsData.logs.length > 0 && (
                        <div className="pt-3 border-t border-line/60 space-y-2">
                          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-signal-amber uppercase tracking-wider">
                            <Terminal className="h-3.5 w-3.5" />
                            <span>MẪU NHẬT KÝ THỰC CHIẾN CÓ CHÚ GIẢI TỪNG DÒNG</span>
                          </div>
                          {techLogsData.logs.map((sampleLog) => (
                            <AnnotatedLogReader key={sampleLog.id} sample={sampleLog} compact />
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* =========================================================
                      01. LÀ GÌ TRONG ĐỜI THỰC & ẨN DỤ
                     ========================================================= */}
                  <section id="sec-01" data-dossier-sec className="space-y-4 pt-2">
                    <div className="border-l-2 border-[#FF5A36] pl-3 space-y-1">
                      <span className="border border-[#FF5A36] text-[#FF5A36] bg-[#FF5A36]/10 px-2 py-0.5 rounded-xs font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-[0_0_6px_rgba(255,90,54,0.2)]">
                        MỤC 01 // DIỄN GIẢI THỰC CHIẾN
                      </span>
                      <h2 className="font-display text-xl font-bold text-bone-100">
                        Bản chất Hành vi &amp; Góc nhìn Đời thường
                      </h2>
                    </div>

                    <div className="space-y-3 font-sans text-xs sm:text-[13px] text-bone-300 leading-relaxed">
                      <div>
                        {renderStixText(
                          `${detail.name} (${detail.attack_id}) là một ${
                            detail.is_subtechnique ? 'kỹ thuật nhánh (Sub-technique)' : 'kỹ thuật (Technique)'
                          } thuộc giai đoạn ${detail.tactics.join(', ')} trong ma trận ATT&CK.`,
                        ).content}
                      </div>

                      {/* Ẩn dụ thực tế: Chỉ hiển thị khi đã được kiểm duyệt (reviewed) */}
                      {detail.metaphor_vi && detail.metaphor_status === 'reviewed' ? (
                        <div className="border-l-2 border-attack/60 bg-surface-elevated p-3.5 space-y-1">
                          <div className="font-mono text-xs font-bold text-attack flex items-center justify-between">
                            <span>❖ ẨN DỤ ĐỜI THƯỜNG: {detail.metaphor_title || ''}</span>
                            <span className="text-[9px] border border-defend/50 text-defend bg-defend/10 px-1.5 py-0.2 rounded-xs font-bold">
                              ĐÃ DUYỆT
                            </span>
                          </div>
                          <p className="text-bone-300 text-xs leading-relaxed">{detail.metaphor_vi}</p>
                        </div>
                      ) : (
                        <div className="p-3 bg-surface border border-line/40 rounded-xs font-mono text-[11px] text-bone-400 italic">
                          [Ẩn dụ đời thường: Chưa có bản duyệt cho kỹ thuật này — Hệ thống ẩn câu mẫu chung để tránh sai lệch bản chất hành vi theo nguyên tắc trung thực].
                        </div>
                      )}

                      {/* Nền tảng bị ảnh hưởng */}
                      {detail.platforms.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                          <span className="text-bone-500 uppercase tracking-wider">NỀN TẢNG BỊ ẢNH HƯỞNG:</span>
                          {detail.platforms.map((pf) => (
                            <span
                              key={pf}
                              className="text-bone-300 px-1.5 py-0.5 bg-surface-elevated"
                            >
                              {pf}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Danh sách Sub-techniques */}
                      {detail.subtechniques.length > 0 && (
                        <div className="pt-2 space-y-2">
                          <div className="font-mono text-xs text-bone-400 uppercase tracking-wider">
                            CÁC KỸ THUẬT NHÁNH ({detail.subtechniques.length} SUB-TECHNIQUES):
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {detail.subtechniques.map((sub) => (
                              <button
                                key={sub.attack_id}
                                type="button"
                                onClick={() => openTechnique(sub.attack_id, detail.domain)}
                                className="flex items-center justify-between p-2.5 text-left border border-line/60 bg-surface-elevated hover:border-attack transition-colors"
                              >
                                <div>
                                  <span className="font-mono text-xs font-bold text-attack mr-2">
                                    {sub.attack_id}
                                  </span>
                                  <span className="text-xs text-bone-200">{sub.name}</span>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-bone-500" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* =========================================================
                      02. VỊ TRÍ TRONG CHUỖI TẤN CÔNG (THƯỚC 15 TACTICS VỪA KHUNG)
                     ========================================================= */}
                  <section id="sec-02" data-dossier-sec className="space-y-4 pt-4 border-t border-line">
                    <div className="border-l-2 border-[#FF5A36] pl-3 space-y-1">
                      <span className="border border-[#FF5A36] text-[#FF5A36] bg-[#FF5A36]/10 px-2 py-0.5 rounded-xs font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-[0_0_6px_rgba(255,90,54,0.2)]">
                        MỤC 02 // ĐỊNH VỊ CHIẾN LƯỢC
                      </span>
                      <h2 className="font-display text-xl font-bold text-bone-100">
                        Vị trí Trên Thước Đo 15 Tactics (v20+)
                      </h2>
                    </div>

                    {/* Thước 15 Tactics VỪA KHÍT 100% không cuộn ngang, ST cho Stealth, DI cho Defense Impairment */}
                    <div className="border border-line bg-surface-elevated p-3.5 rounded-xs space-y-3">
                      <div
                        className="w-full"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
                          gap: '3px',
                        }}
                      >
                        {ALL_15_TACTICS.map((tac) => {
                          const isCurrent = detail.tactics.some(
                            (t) =>
                              t.toLowerCase() === tac.id ||
                              t.toLowerCase() === tac.short.toLowerCase() ||
                              t.toLowerCase().includes(tac.top.toLowerCase()),
                          )
                          return (
                            <div
                              key={tac.id}
                              className={cn(
                                'flex flex-col items-center justify-between py-1.5 px-0.5 text-center font-mono rounded-xs border transition-all relative h-[86px]',
                                isCurrent
                                  ? 'border-[#FF5A36] bg-[#FF5A36] text-[#0A0C0B] font-black shadow-md z-10'
                                  : 'border-line/40 bg-surface text-bone-400 hover:border-line-strong hover:text-bone-100',
                              )}
                              title={`${tac.short} — ${tac.top} ${tac.bot}`}
                            >
                              <span className="text-[10px] font-bold leading-none">{tac.short}</span>
                              <div className="text-[8px] tracking-tight leading-tight font-medium text-center py-0.5 select-none">
                                <div>{tac.top}</div>
                                <div>{tac.bot}</div>
                              </div>
                              {tac.isNewV19 ? (
                                <span className={cn('text-[7.5px] font-bold leading-none', isCurrent ? 'text-ink-950' : 'text-defend')}>
                                  v19
                                </span>
                              ) : (
                                <span className="text-[7.5px] opacity-40">··</span>
                              )}
                              {isCurrent && (
                                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#FF5A36] rotate-45" />
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Tuyến đường kề cận (trước -> technique -> sau) */}
                      <div className="border-t border-line/60 pt-2.5 text-xs font-mono text-bone-300">
                        <div className="text-[11px] text-bone-400 text-center italic py-1.5 bg-surface border border-line/30 rounded-xs">
                          CHƯA ĐỦ DỮ LIỆU ĐỂ LẬP BẢN ĐỒ TUYẾN ĐƯỜNG KỀ CẬN CHO KỸ THUẬT NÀY
                        </div>
                        <div className="font-mono text-[10px] text-bone-500 text-center pt-1.5">
                          * Thứ tự suy ra từ quan hệ trực tiếp trong các Campaign STIX chính thức, không dùng dữ liệu giả định.
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* =========================================================
                      03. AI TỪNG DÙNG TRONG THỰC TẾ (CHÒM SAO D3-FORCE & DOT-PLOT)
                     ========================================================= */}
                  <section id="sec-03" data-dossier-sec className="space-y-4 pt-4 border-t border-line">
                    <div className="border-l-2 border-[#FF5A36] pl-3 space-y-1">
                      <span className="border border-[#FF5A36] text-[#FF5A36] bg-[#FF5A36]/10 px-2 py-0.5 rounded-xs font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-[0_0_6px_rgba(255,90,54,0.2)]">
                        MỤC 03 // BẰNG CHỨNG THỰC TẾ
                      </span>
                      <h2 className="font-display text-xl font-bold text-bone-100">
                        Chòm Sao Thực Thể &amp; Xếp Hạng Độ Phổ Biến
                      </h2>
                    </div>

                    {/* Dot-plot độ phổ biến */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-surface-elevated border border-line font-mono text-xs">
                      <div>
                        <span className="text-bone-400 uppercase text-[10px] mr-2">XẾP HẠNG ĐỘ PHỔ BIẾN:</span>
                        <strong className="text-attack">Hạng {popularityInfo.rank}</strong>
                        <span className="text-bone-500"> / {popularityInfo.total} Kỹ thuật STIX 2.1</span>
                      </div>
                      <div className="flex items-center gap-1" title={`Độ phổ biến: ${popularityInfo.dots}/20`}>
                        {Array.from({ length: 20 }).map((_, i) => (
                          <span
                            key={i}
                            className={cn(
                              'h-2 w-1.5 rounded-xs',
                              i < popularityInfo.dots ? 'bg-attack' : 'bg-surface border border-line',
                            )}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Sơ đồ Chòm sao d3-force Deterministic Layout */}
                    <div className="border border-line bg-surface-elevated p-3 rounded-xs space-y-2">
                      <div className="font-mono text-[10px] uppercase text-bone-500 flex items-center justify-between">
                        <span>CHÒM SAO QUAN HỆ (○ GROUP · □ SOFTWARE · △ CAMPAIGN):</span>
                        <span>{constellationNodes.length} THỰC THỂ KẾT NỐI</span>
                      </div>

                      {constellationNodes.length === 0 ? (
                        <div className="border border-line bg-surface p-6 text-center font-mono text-xs text-bone-400 italic rounded-xs">
                          Chưa có liên kết với Group / Software / Campaign nào được ghi nhận trong tập dữ liệu STIX 2.1 hiện tại.
                        </div>
                      ) : constellationNodes.length < 6 ? (
                        /* Khi ít hơn 6 thực thể: hiển thị dạng danh sách chi tiết có cấu trúc thay vì canvas trống trải */
                        <div className="border border-line bg-surface p-3.5 rounded-xs space-y-2">
                          <div className="text-[10px] font-mono text-bone-400 flex items-center justify-between pb-1.5 border-b border-line/60">
                            <span className="font-bold text-bone-200">DANH SÁCH THỰC THỂ GHI NHẬN ({constellationNodes.length})</span>
                            <span className="text-[9px] text-bone-500 uppercase">[BẢNG TỐI ƯU CHO &lt; 6 ĐỐI TƯỢNG]</span>
                          </div>
                          <div className="divide-y divide-line/40">
                            {constellationNodes.map((n) => {
                              const isGroup = n.type === 'group'
                              const isSoftware = n.type === 'software'
                              return (
                                <div key={n.id} className="py-2 flex items-center justify-between gap-3 font-mono text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      'px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase shrink-0',
                                      isGroup && 'border border-attack text-attack bg-attack/10',
                                      isSoftware && 'border border-bone-400 text-bone-200 bg-surface-elevated',
                                      !isGroup && !isSoftware && 'border border-defend text-defend bg-defend/10',
                                    )}>
                                      {isGroup ? '○ Group' : isSoftware ? '▫ Software' : '△ Campaign'}
                                    </span>
                                    <span className="font-bold text-bone-100">{n.name}</span>
                                    <span className="text-bone-500 text-[10px]">({n.id})</span>
                                  </div>
                                  <span className="text-[10px] text-bone-400 font-sans italic hidden sm:inline">
                                    Ghi nhận qua quan hệ STIX 2.1
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <svg
                          viewBox="0 0 480 260"
                          className="w-full h-auto select-none border border-line rounded-xs bg-[#FAF8F3] dark:bg-[#0A0C0B]"
                        >
                          {/* Đường liên kết từ tâm đến các node */}
                          {constellationNodes.map((n) => (
                            <line
                              key={`link-${n.id}`}
                              x1="240"
                              y1="130"
                              x2={n.x}
                              y2={n.y}
                              stroke="var(--attack)"
                              strokeOpacity="0.45"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          ))}

                          {/* Node Trung tâm: Kỹ thuật hiện tại */}
                          <circle
                            cx="240"
                            cy="130"
                            r="16"
                            fill="var(--attack)"
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          />
                          <text
                            x="240"
                            y="134"
                            textAnchor="middle"
                            fill="#FFFFFF"
                            fontSize="9.5"
                            fontFamily="IBM Plex Mono, monospace"
                            fontWeight="bold"
                          >
                            {detail.attack_id.split('.')[0]}
                          </text>

                          {/* Các node thực thể xung quanh theo chuẩn hình khối DESIGN.md */}
                          {constellationNodes.map((n) => {
                            const isGroup = n.type === 'group'
                            const isSoftware = n.type === 'software'
                            return (
                              <g key={n.id} className="cursor-pointer group">
                                {isGroup && (
                                  <circle
                                    cx={n.x}
                                    cy={n.y}
                                    r={n.weight + 4}
                                    className="fill-surface stroke-attack"
                                    strokeWidth="2"
                                  />
                                )}
                                {isSoftware && (
                                  <rect
                                    x={n.x - n.weight - 3}
                                    y={n.y - n.weight - 3}
                                    width={(n.weight + 3) * 2}
                                    height={(n.weight + 3) * 2}
                                    className="fill-surface stroke-bone-300"
                                    strokeWidth="2"
                                  />
                                )}
                                {!isGroup && !isSoftware && (
                                  <polygon
                                    points={`${n.x},${n.y - 8} ${n.x + 7},${n.y + 6} ${n.x - 7},${n.y + 6}`}
                                    className="fill-surface stroke-defend"
                                    strokeWidth="2"
                                  />
                                )}
                                <text
                                  x={n.x}
                                  y={n.y + 16}
                                  textAnchor="middle"
                                  fill="var(--bone-100)"
                                  fontSize="9"
                                  fontFamily="IBM Plex Mono, monospace"
                                  fontWeight="bold"
                                  className="pointer-events-none group-hover:fill-attack transition-colors select-none"
                                >
                                  {n.name}
                                </text>
                              </g>
                            )
                          })}
                        </svg>
                      )}
                    </div>

                    {/* Danh sách vụ việc thực tế: 2 dòng tiếng Việt + mở rộng nguyên văn */}
                    <div className="space-y-2 pt-1 font-sans">
                      <div className="font-mono text-xs uppercase text-bone-400 tracking-wider">
                        VÍ DỤ THỰC THI (PROCEDURE EXAMPLES):
                      </div>
                      <div className="divide-y divide-line border border-line bg-surface-elevated">
                        {[
                          ...detail.procedures.campaigns,
                          ...detail.procedures.groups,
                          ...detail.procedures.software,
                        ]
                          .slice(0, 8)
                          .map((proc) => {
                            const isProcExpanded = expandedProcedures[proc.attack_id]
                            const cleanText = proc.description || 'Chưa có mô tả chi tiết.'
                            return (
                              <div key={`${proc.type}-${proc.attack_id}`} className="p-3 space-y-1.5 text-xs">
                                <div className="flex items-center justify-between font-mono">
                                  <span className="font-bold text-bone-100">
                                    <span className="text-attack mr-1.5">[{proc.attack_id}]</span>
                                    {proc.name}
                                  </span>
                                  <span className="text-[10px] uppercase text-bone-500">
                                    {proc.type}
                                  </span>
                                </div>

                                <div className={cn('text-bone-300 leading-relaxed font-sans', !isProcExpanded && 'line-clamp-2')}>
                                  {renderStixText(t(cleanText)).content}
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedProcedures((prev) => ({
                                      ...prev,
                                      [proc.attack_id]: !prev[proc.attack_id],
                                    }))
                                  }
                                  className="font-mono text-[10px] text-bone-400 hover:text-bone-100 inline-flex items-center gap-1"
                                >
                                  {isProcExpanded ? (
                                    <>
                                      <ChevronUp className="h-3 w-3" />
                                      <span>Thu gọn</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3" />
                                      <span>Mở rộng nguyên văn STIX</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  </section>

                  {/* =========================================================
                      04. TẦM NHÌN CỦA PHÒNG THỦ (SƠ ĐỒ ĐƯỜNG CHÂN TRỜI THẬT)
                     ========================================================= */}
                  <section id="sec-04" data-dossier-sec className="space-y-4 pt-4 border-t border-line">
                    <div className="border-l-2 border-[#FF5A36] pl-3 space-y-1">
                      <span className="border border-[#FF5A36] text-[#FF5A36] bg-[#FF5A36]/10 px-2 py-0.5 rounded-xs font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-[0_0_6px_rgba(255,90,54,0.2)]">
                        MỤC 04 // TẦM NHÌN CỦA PHÒNG THỦ
                      </span>
                      <h2 className="font-display text-xl font-bold text-bone-100">
                        Sơ Đồ Đường Chân Trời: Ngoài Vành Đai vs Trong Mạng
                      </h2>
                    </div>

                    {/* Sơ đồ Đường chân trời SVG thật (Không glow, không 2 hộp chung chung) */}
                    <div className="border border-line bg-surface-elevated p-4 rounded-xs space-y-3">
                      <svg
                        viewBox="0 0 540 145"
                        className="w-full h-auto border border-line rounded-xs select-none bg-[#FAF8F3] dark:bg-[#0A0C0B]"
                      >
                        {/* Vùng Ngoài ranh giới (Threat Zone) - KHÔNG TINT, hairline chuẩn DESIGN.md */}
                        <rect
                          x="0"
                          y="0"
                          width="270"
                          height="145"
                          fill="none"
                          stroke="var(--line-subtle)"
                        />
                        <text
                          x="135"
                          y="24"
                          textAnchor="middle"
                          fill="var(--attack)"
                          fontSize="10"
                          fontFamily="IBM Plex Mono, monospace"
                          fontWeight="bold"
                        >
                          BÊN NGOÀI TẦM NHÌN (NGOÀI VÀNH ĐAI)
                        </text>

                        {/* Đường chân trời (Horizon boundary) */}
                        <line
                          x1="270"
                          y1="0"
                          x2="270"
                          y2="145"
                          stroke="var(--attack)"
                          strokeWidth="2"
                          strokeDasharray="4 3"
                        />
                        <rect
                          x="180"
                          y="122"
                          width="180"
                          height="18"
                          rx="2"
                          className="fill-surface stroke-attack"
                          strokeWidth="1"
                        />
                        <text
                          x="270"
                          y="134"
                          textAnchor="middle"
                          fill="var(--attack)"
                          fontSize="8.5"
                          fontFamily="IBM Plex Mono, monospace"
                          fontWeight="bold"
                        >
                          [ RANH GIỚI VÀNH ĐAI MẠNG ]
                        </text>

                        {/* Vùng Trong ranh giới (Defense Zone) - KHÔNG TINT */}
                        <rect
                          x="270"
                          y="0"
                          width="270"
                          height="145"
                          fill="none"
                          stroke="var(--line-subtle)"
                        />
                        <text
                          x="405"
                          y="24"
                          textAnchor="middle"
                          fill="var(--defend)"
                          fontSize="10"
                          fontFamily="IBM Plex Mono, monospace"
                          fontWeight="bold"
                        >
                          TRONG VÙNG KIỂM SOÁT (NỘI BỘ)
                        </text>

                        {/* Vẽ vector luồng theo ranh giới kỹ thuật */}
                        {boundaryType === 'cross' ? (
                          <g>
                            {/* Giai đoạn 1: Ngoài mạng */}
                            <circle cx="95" cy="72" r="14" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
                            <text x="95" y="76" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="bold">1</text>
                            <text x="95" y="98" textAnchor="middle" fill="var(--bone-100)" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="bold">{crossStages.stage1}</text>

                            {/* Mũi tên xuyên ranh giới */}
                            <path d="M 115 72 L 255 72" stroke="var(--attack)" strokeWidth="2.5" strokeDasharray="3 3" />
                            <polygon points="265,72 253,67 253,77" fill="var(--attack)" />

                            {/* Giai đoạn 2: Tại ranh giới */}
                            <circle cx="270" cy="72" r="14" fill="var(--attack)" stroke="#FFFFFF" strokeWidth="2" />
                            <text x="270" y="76" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="bold">2</text>
                            <text x="270" y="98" textAnchor="middle" fill="var(--attack)" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="bold">{crossStages.stage2}</text>

                            {/* Mũi tên vào trong máy trạm */}
                            <path d="M 285 72 L 425 72" stroke="var(--defend)" strokeWidth="2.5" />
                            <polygon points="435,72 423,67 423,77" fill="var(--defend)" />

                            {/* Giai đoạn 3: Trong endpoint */}
                            <circle cx="445" cy="72" r="14" fill="var(--defend)" stroke="#FFFFFF" strokeWidth="2" />
                            <text x="445" y="76" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="bold">3</text>
                            <text x="445" y="98" textAnchor="middle" fill="var(--defend)" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="bold">{crossStages.stage3}</text>
                          </g>
                        ) : boundaryType === 'pre' ? (
                          <g>
                            <circle cx="135" cy="72" r="16" fill="var(--attack)" stroke="#FFFFFF" strokeWidth="2" />
                            <text x="135" y="76" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="bold">{detail.attack_id}</text>
                            <text x="135" y="100" textAnchor="middle" fill="var(--attack)" fontSize="9.5" fontFamily="IBM Plex Mono" fontWeight="bold">Hoàn toàn ngoài mạng</text>
                            <g>
                              <rect x="295" y="55" width="220" height="36" rx="2" fill="none" stroke="var(--line)" strokeDasharray="3 2" />
                              <text x="405" y="71" textAnchor="middle" fill="var(--bone-300)" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="bold">NGOÀI TẦM NHÌN LOG NỘI BỘ</text>
                              <text x="405" y="83" textAnchor="middle" fill="var(--bone-500)" fontSize="8" fontFamily="IBM Plex Mono">Cần nguồn Threat Intel bên ngoài</text>
                            </g>
                          </g>
                        ) : (
                          <g>
                            <g>
                              <rect x="25" y="55" width="220" height="36" rx="2" fill="none" stroke="var(--line)" strokeDasharray="3 2" />
                              <text x="135" y="71" textAnchor="middle" fill="var(--bone-300)" fontSize="9" fontFamily="IBM Plex Mono" fontWeight="bold">KHÔNG PHÁT SINH TỪ NGOÀI</text>
                              <text x="135" y="83" textAnchor="middle" fill="var(--bone-500)" fontSize="8" fontFamily="IBM Plex Mono">Thực thi trực tiếp trong ranh giới mạng</text>
                            </g>
                            <circle cx="405" cy="72" r="16" fill="var(--defend)" stroke="#FFFFFF" strokeWidth="2" />
                            <text x="405" y="76" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="bold">{detail.attack_id}</text>
                            <text x="405" y="100" textAnchor="middle" fill="var(--defend)" fontSize="9.5" fontFamily="IBM Plex Mono" fontWeight="bold">Thực thi trên Endpoint</text>
                          </g>
                        )}
                      </svg>

                      {/* Lời giải thích riêng cho từng kỹ thuật cụ thể */}
                      <div className="text-xs text-bone-300 font-sans leading-relaxed pt-1">
                        <strong>❖ Nhận định thực chiến cho {detail.attack_id}: </strong>
                        <span>{tacticalInsight}</span>
                      </div>
                    </div>
                  </section>

                  {/* =========================================================
                      05. BẮT NÓ THẾ NÀO (SƠ ĐỒ VUÔNG GÓC DET → AN → DC)
                     ========================================================= */}
                  <section id="sec-05" data-dossier-sec className="space-y-4 pt-4 border-t border-line">
                    <div className="border-l-2 border-[#6FCFB2] pl-3 space-y-1">
                      <span className="border border-[#FF5A36] text-[#FF5A36] bg-[#FF5A36]/10 px-2 py-0.5 rounded-xs font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-[0_0_6px_rgba(255,90,54,0.2)]">
                        MỤC 05 // CHIẾN LƯỢC PHÁT HIỆN
                      </span>
                      <h2 className="font-display text-xl font-bold text-bone-100">
                        Sơ Đồ Đường Nối Vuông Góc: DET → AN → DC
                      </h2>
                    </div>

                    <div className="font-mono text-[10px] text-bone-400">
                      QUY ƯỚC: DET = Detection Strategy · AN = Analytic · DC = Data Component
                    </div>

                    {detail.detection_strategies.length === 0 ? (
                      <div className="border border-line p-6 text-center font-mono text-xs text-bone-500">
                        Chưa có Detection Strategy chính thức cho kỹ thuật này trong gói dữ liệu hiện tại.
                      </div>
                    ) : (
                      <div className="space-y-6 font-mono text-xs">
                        {detail.detection_strategies.map((det) => (
                          <div key={det.attack_id} className="space-y-3">
                            {/* Node gốc: DET */}
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-defend border border-defend/40 bg-defend-muted/20 px-2 py-0.5 rounded-xs">
                                DET: {det.attack_id}
                              </span>
                              <span className="font-display text-sm font-bold text-bone-100 font-sans">
                                {det.name}
                              </span>
                            </div>

                            {/* Nhánh con AN nối vuông góc */}
                            <div className="space-y-4 pl-4 border-l-2 border-line ml-3">
                              {det.analytics.map((an) => {
                                const isAnExpanded = expandedAnalytics[an.attack_id]
                                return (
                                  <div key={an.attack_id} className="space-y-2 relative">
                                    {/* Đường gạch ngang vuông góc */}
                                    <div className="absolute -left-4 top-2.5 w-3.5 h-[1.5px] bg-line" />

                                    {/* Node AN */}
                                    <div className="flex items-center gap-2 pl-1">
                                      <span className="font-bold text-bone-100 border border-line px-1.5 py-0.2 rounded-xs bg-surface-elevated">
                                        AN: {an.attack_id}
                                      </span>
                                      <span className="text-bone-200">{an.name}</span>
                                      <div className="flex gap-1 ml-auto">
                                        {an.platforms.map((p) => (
                                          <span key={p} className="text-[9px] text-bone-500 border border-line px-1">
                                            {p}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Mô tả cắt 2 dòng + mở rộng */}
                                    <div className="pl-5 text-bone-400 font-sans text-xs">
                                      <div className={cn('leading-relaxed', !isAnExpanded && 'line-clamp-2')}>
                                        {renderStixText(t(an.description)).content}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setExpandedAnalytics((prev) => ({
                                            ...prev,
                                            [an.attack_id]: !prev[an.attack_id],
                                          }))
                                        }
                                        className="font-mono text-[10px] text-attack hover:underline mt-1"
                                      >
                                        {isAnExpanded ? '[-] Thu gọn mô tả' : '[+] Mở rộng mô tả'}
                                      </button>
                                    </div>

                                    {/* Nhánh con DC nối vuông góc từ AN */}
                                    {an.log_sources.length > 0 && (
                                      <div className="pl-6 border-l border-line/60 ml-5 space-y-1 pt-1">
                                        {an.log_sources.map((ls, idx) => (
                                          <div key={`${ls.name}-${idx}`} className="flex items-center gap-2 text-[11px] text-bone-300">
                                            <span className="text-bone-500 font-bold">└──</span>
                                            <span className="text-defend font-bold">
                                              [{ls.data_component?.attack_id || 'DC'}]
                                            </span>
                                            <span>{ls.data_component?.name || ls.name}</span>
                                            {ls.channel && <span className="text-bone-500 text-[10px]">({ls.channel})</span>}
                                          </div>
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
                    )}

                    {/* LUẬT PHÁT HIỆN SIGMAHQ CHÍNH THỨC */}
                    <div className="pt-4 border-t border-line/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-signal-amber uppercase tracking-wider">
                          <FileCode2 className="h-4 w-4" />
                          <span>LUẬT PHÁT HIỆN SIGMAHQ CHÍNH THỨC ({techSigmaData?.rules.length || 0})</span>
                        </div>
                        <span className="font-mono text-[10px] text-bone-500">
                          CHUẨN MỞ ĐỘC LẬP SIEM
                        </span>
                      </div>

                      {techSigmaData?.rules && techSigmaData.rules.length > 0 ? (
                        <div className="space-y-4">
                          {techSigmaData.rules.map((rule) => (
                            <SigmaRuleViewer key={rule.id} rule={rule} />
                          ))}
                        </div>
                      ) : (
                        <div className="p-3.5 border border-line/40 rounded-xs bg-surface font-mono text-[11px] text-bone-400 italic">
                          CHƯA CÓ LUẬT SIGMAHQ BIÊN SOẠN RIÊNG CHO KỸ THUẬT NÀY · DÙNG CHỮ KÝ AN/DC THEO MÔ HÌNH TRÊN.
                        </div>
                      )}
                    </div>

                    {/* CÔNG THỨC ĐẶC TRƯNG MACHINE LEARNING (ML FEATURE RECIPES) */}
                    <div className="pt-4 border-t border-line/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-signal-teal uppercase tracking-wider">
                          <Cpu className="h-4 w-4" />
                          <span>CÔNG THỨC ĐẶC TRƯNG MACHINE LEARNING ({techMlData?.recipes.length || 0})</span>
                        </div>
                        <span className="font-mono text-[10px] text-bone-500">
                          TÍN HIỆU TOÁN HỌC &amp; CODE TRÍCH XUẤT
                        </span>
                      </div>

                      {techMlData?.recipes && techMlData.recipes.length > 0 ? (
                        <div className="space-y-4">
                          {techMlData.recipes.map((recipe) => (
                            <MlRecipeCard key={recipe.id} recipe={recipe} />
                          ))}
                        </div>
                      ) : (
                        <div className="p-3.5 border border-line/40 rounded-xs bg-surface font-mono text-[11px] text-bone-400 italic">
                          CHƯA CÓ CÔNG THỨC ML ĐƯỢC DUYỆT RIÊNG CHO KỸ THUẬT NÀY · THAM KHẢO CÁC ĐẶC TRƯNG PROCESS/NETWORK CHUNG.
                        </div>
                      )}
                    </div>
                  </section>

                  {/* =========================================================
                      06. CHẶN NÓ THẾ NÀO (MITIGATIONS CỤ THỂ ≤ 20 TỪ)
                     ========================================================= */}
                  <section id="sec-06" data-dossier-sec className="space-y-4 pt-4 border-t border-line">
                    <div className="border-l-2 border-[#6FCFB2] pl-3 space-y-1">
                      <span className="border border-[#FF5A36] text-[#FF5A36] bg-[#FF5A36]/10 px-2 py-0.5 rounded-xs font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-[0_0_6px_rgba(255,90,54,0.2)]">
                        MỤC 06 // BIỆN PHÁP GIẢM THIỂU
                      </span>
                      <h2 className="font-display text-xl font-bold text-bone-100">
                        Biện pháp Phòng vệ &amp; Hành động Cụ thể
                      </h2>
                    </div>

                    {detail.mitigations.length === 0 ? (
                      <div className="border border-line bg-surface-elevated p-4 rounded-xs space-y-2 font-mono text-xs">
                        <div className="text-bone-300">
                          Kỹ thuật nhánh này không có Mitigation riêng trong STIX.
                        </div>
                        {detail.parent && (
                          <div className="border border-defend/30 bg-defend-muted/10 p-3 text-defend rounded-xs flex items-center justify-between">
                            <span>
                              ❖ Kế thừa chính sách từ kỹ thuật cha: <strong>[{detail.parent.attack_id} {detail.parent.name}]</strong>
                            </span>
                            <span className="font-mono text-[9px] border border-defend/40 px-1.5 py-0.2 rounded-xs">
                              KẾ THỪA
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-line border border-line font-sans text-xs">
                        {detail.mitigations.map((m) => {
                          const isMitExpanded = expandedMitigations[m.attack_id]
                          const actionVi = m.action_vi || m.description || `Áp dụng biện pháp ${m.name} theo khuyến nghị MITRE.`
                          return (
                            <div key={m.attack_id} className="p-3.5 bg-surface-elevated space-y-1.5">
                              <div className="flex items-center justify-between font-mono">
                                <span className="font-bold text-bone-100 text-xs inline-flex items-center gap-2">
                                  <span className="border border-defend text-defend bg-defend/10 font-mono text-xs font-bold px-2 py-0.5 rounded-xs shadow-[0_0_6px_rgba(111,207,178,0.15)]">
                                    {m.attack_id}
                                  </span>
                                  <span>{m.name}</span>
                                </span>
                                {m.is_auto ? (
                                  <span className="font-mono text-[9px] text-caution border border-caution/50 bg-caution/10 px-1.5 py-0.5 rounded-xs font-bold">
                                    BẢN DỊCH TỰ ĐỘNG
                                  </span>
                                ) : (
                                  <span className="font-mono text-[9px] text-defend border border-defend/50 bg-defend/10 px-1.5 py-0.5 rounded-xs font-bold">
                                    BẢN DUYỆT VI
                                  </span>
                                )}
                              </div>

                              {/* 1 câu tiếng Việt hành động cụ thể ≤ 20 từ */}
                              <div className="text-bone-200 font-medium leading-relaxed font-sans">
                                ➔ {actionVi}
                              </div>

                              {/* Accordion mở rộng nguyên văn MITRE tiếng Anh */}
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedMitigations((prev) => ({
                                      ...prev,
                                      [m.attack_id]: !prev[m.attack_id],
                                    }))
                                  }
                                  className="font-mono text-[10px] text-bone-400 hover:text-bone-100 inline-flex items-center gap-1"
                                >
                                  {isMitExpanded ? (
                                    <>
                                      <ChevronUp className="h-3 w-3" />
                                      <span>Thu gọn nguyên văn tiếng Anh</span>
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3" />
                                      <span>Nguyên văn MITRE [English STIX]</span>
                                    </>
                                  )}
                                </button>

                                {isMitExpanded && (
                                  <div className="mt-2 p-2.5 bg-surface border border-line text-[11px] text-bone-300 font-sans leading-relaxed">
                                    {renderStixText(m.description).content}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>

                  {/* =========================================================
                      07. NGUYÊN VĂN MITRE ATT&CK (RENDERSTIXTEXT TOÀN DIỆN)
                     ========================================================= */}
                  <section id="sec-07" data-dossier-sec className="space-y-4 pt-4 border-t border-line">
                    <div className="border-l-2 border-[#FF5A36] pl-3 space-y-1">
                      <span className="border border-[#FF5A36] text-[#FF5A36] bg-[#FF5A36]/10 px-2 py-0.5 rounded-xs font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-[0_0_6px_rgba(255,90,54,0.2)]">
                        MỤC 07 // TÀI LIỆU GỐC STIX 2.1
                      </span>
                      <h2 className="font-display text-xl font-bold text-bone-100">
                        Mô tả Toàn văn &amp; Danh mục Trích dẫn
                      </h2>
                    </div>

                    <div className="border border-line bg-surface-elevated p-4 rounded-xs">
                      <StixArticleViewer
                        text={isTranslated ? t(detail.description) : detail.description}
                        defaultExpanded={false}
                      />
                    </div>
                  </section>

                  {/* =========================================================
                      08. GHI NHỚ KỸ THUẬT & GHI CHÚ PHÂN TÍCH
                     ========================================================= */}
                  <section id="sec-08" data-dossier-sec className="space-y-4 pt-4 border-t border-line pb-12">
                    <div className="border-l-2 border-[#FF5A36] pl-3 space-y-1">
                      <span className="border border-[#FF5A36] text-[#FF5A36] bg-[#FF5A36]/10 px-2 py-0.5 rounded-xs font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 shadow-[0_0_6px_rgba(255,90,54,0.2)]">
                        MỤC 08 // GHI NHỚ &amp; ÔN TẬP
                      </span>
                      <h2 className="font-display text-xl font-bold text-bone-100">
                        Tự Kiểm tra Tức thì &amp; Ghi chú Phân tích
                      </h2>
                    </div>

                    {/* Thẻ Ôn Thụ Động & Thuật Ngữ Cốt Lõi (Passive Review - Không bài tập) */}
                    <div className="border border-line bg-surface-elevated p-4 rounded-xs space-y-3 font-sans">
                      <div className="flex items-center justify-between border-b border-line/60 pb-2">
                        <div className="font-mono text-xs font-bold text-signal-amber uppercase tracking-wider flex items-center gap-1.5">
                          <Bookmark className="h-3.5 w-3.5" />
                          <span>TỔNG KẾT TRI THỨC &amp; THẺ ÔN THỤ ĐỘNG</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            detail &&
                            toggleBookmark.mutate({
                              attackId: detail.attack_id,
                              domain: detail.domain,
                              existingId: existingBookmark?.id,
                            })
                          }
                          className={cn(
                            'font-mono text-[11px] px-2.5 py-1 rounded-xs border transition-colors flex items-center gap-1.5',
                            existingBookmark
                              ? 'border-signal-amber bg-signal-amber/15 text-signal-amber font-bold'
                              : 'border-line text-bone-400 hover:text-bone-100 hover:border-line-strong',
                          )}
                        >
                          <Bookmark className="h-3 w-3" />
                          <span>{existingBookmark ? 'ĐÃ ĐÁNH DẤU XEM LẠI' : 'ĐÁNH DẤU ĐỂ XEM LẠI'}</span>
                        </button>
                      </div>

                      <p className="text-xs text-bone-300 leading-relaxed">
                        Kỹ thuật <strong className="text-bone-100 font-mono">{detail.attack_id}</strong> đòi hỏi sự phối hợp chặt chẽ giữa cảm biến <KnowledgeHovercard termKey="EDR">EDR</KnowledgeHovercard> trên thiết bị đầu cuối và hệ thống lưu trữ tập trung <KnowledgeHovercard termKey="SIEM">SIEM</KnowledgeHovercard>. Chú ý phát hiện thủ đoạn <KnowledgeHovercard termKey="LotL">Living off the Land (LotL)</KnowledgeHovercard> bằng cách theo dõi bất thường <KnowledgeHovercard termKey="Parent-Child">cặp tiến trình cha–con</KnowledgeHovercard> và tính toán <KnowledgeHovercard termKey="Entropy">Entropy dòng lệnh</KnowledgeHovercard>.
                      </p>

                      <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono border-t border-line/50">
                        <span className="text-bone-500">Tra cứu nhanh:</span>
                        <KnowledgeHovercard termKey="Sigma">#SigmaRule</KnowledgeHovercard>
                        <span className="text-bone-600">·</span>
                        <KnowledgeHovercard termKey="auditd">#LinuxAuditd</KnowledgeHovercard>
                        <span className="text-bone-600">·</span>
                        <KnowledgeHovercard termKey="eBPF">#eBPFTetragon</KnowledgeHovercard>
                      </div>
                    </div>

                    {/* Ghi chú cá nhân (Supabase RLS) */}
                    <div className="space-y-3 font-mono text-xs pt-2">
                      <div className="font-mono text-xs uppercase text-bone-400 tracking-wider">
                        GHI CHÚ PHÂN TÍCH RIÊNG (BẢO MẬT BẰNG SUPABASE RLS):
                      </div>

                      <textarea
                        rows={5}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder={`Ghi chú tương quan SIEM, EventCode cần bật hoặc kịch bản Threat Hunting cho ${detail.attack_id}...`}
                        className="w-full border border-line bg-surface-elevated p-3 text-bone-100 focus:border-attack focus:outline-none rounded-xs font-mono text-xs"
                      />

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-defend font-mono">
                          {noteSavedToast && '✓ Đã lưu ghi chú phân tích vào Supabase.'}
                        </span>
                        <button
                          type="button"
                          disabled={saveNote.isPending}
                          onClick={() => void handleSaveNote()}
                          className="border border-line bg-surface-elevated px-4 py-2 text-xs font-bold text-bone-100 hover:border-attack disabled:opacity-50 rounded-xs uppercase tracking-wider transition-colors"
                        >
                          {saveNote.isPending ? 'Đang lưu...' : 'Lưu ghi chú'}
                        </button>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
