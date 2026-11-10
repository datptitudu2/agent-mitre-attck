import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  FileCode2,
  Grid3X3,
  PlaySquare,
  Radar,
  Search,
  ShieldOff,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { VersionsResponse } from '@/lib/types'
import { useBookmarks } from '@/hooks/useUserData'
import { useUiStore } from '@/stores/useUiStore'
import { DefensePolyhedronCanvas } from '@/components/dashboard/DefensePolyhedronCanvas'

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

  const { data: versionsData } = useQuery({
    queryKey: ['versions'],
    queryFn: () => apiFetch<VersionsResponse>('/api/versions'),
  })

  const enterprise = versionsData?.domains.find((d) => d.domain === 'enterprise-attack')
  const stats = enterprise?.stats ?? {}
  const currentVer = enterprise?.current_version ?? '20.1'

  const statCards = [
    {
      num: '01',
      label: 'Enterprise Tactics',
      value: stats.tactics ?? 15,
      sub: 'Gồm Stealth & Impairment',
      tag: 'TA0001–TA0112',
    },
    {
      num: '02',
      label: 'Techniques',
      value: stats.techniques ?? 227,
      sub: `+ ${stats.subtechniques ?? 479} Sub-techniques`,
      tag: 'T1000+',
    },
    {
      num: '03',
      label: 'Detection Strategies',
      value: stats.detection_strategies ?? 706,
      sub: `${stats.analytics ?? 773} Analytics (v18+)`,
      tag: 'DET & AN',
    },
    {
      num: '04',
      label: 'Data Components',
      value: stats.data_components ?? 106,
      sub: 'Nguồn Log & Telemetry chuẩn',
      tag: 'DC0001+',
    },
    {
      num: '05',
      label: 'Threat Groups & Campaigns',
      value: (stats.groups ?? 178) + (stats.campaigns ?? 57),
      sub: `${stats.groups ?? 178} Groups · ${stats.campaigns ?? 57} Campaigns`,
      tag: 'G & C',
    },
    {
      num: '06',
      label: 'Software & Mitigations',
      value: stats.software ?? 842,
      sub: `${stats.mitigations ?? 44} Biện pháp giảm thiểu`,
      tag: 'S & M',
    },
  ]

  return (
    <div className="space-y-10 font-sans pb-16 text-bone-100">
      {/* =========================================================================
          1. HERO SECTION — PHÒNG THÍ NGHIỆM CHIẾN TRƯỜNG SỐ & LƯỚI ĐA DIỆN 3D
          Lấy cảm hứng từ Xizt DevOps (3D isometric cyber cage) & SecureSphere (cyber defense SaaS)
          Sử dụng semantic tokens (bg-surface, bg-surface-elevated, text-bone-100...)
          đảm bảo CẢ LIGHT VÀ DARK ĐỀU ĐẸP RỰC RỠ, HÀI HÒA NHƯ NHAU!
         ========================================================================= */}
      <section
        aria-label="Khu vực mở đầu Hồ sơ tình báo ATT&CK"
        className="relative border-2 border-line bg-surface p-6 sm:p-8 lg:p-10 rounded-xs overflow-hidden shadow-lg transition-colors"
      >
        {/* Architectural drafting marks */}
        <div className="hidden sm:block absolute top-2.5 left-3.5 font-mono text-[9px] text-bone-500 uppercase tracking-widest pointer-events-none">
          DOC.REF // ATT&amp;CK-LAB-CORE · SEC-01
        </div>
        <div className="absolute top-2.5 right-3.5 font-mono text-[9px] text-bone-500 uppercase tracking-widest pointer-events-none">
          <span className="sm:hidden">STIX 2.1 · </span>
          <span className="hidden sm:inline">STIX 2.1 LIVE · </span>
          ENTERPRISE v{currentVer}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center mt-2">
          {/* Cột trái: Văn bản biên tập báo chí & Hành động trọng tâm */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3.5">
              <div className="inline-flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold text-attack uppercase tracking-wider">
                <span className="px-2.5 py-1 border border-attack/40 bg-attack-muted/20 rounded-xs inline-flex items-center gap-1.5 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-attack animate-ping" />
                  <span>▲ PHÒNG THÍ NGHIỆM CHIẾN TRƯỜNG SỐ</span>
                </span>
                <span className="text-bone-500">··</span>
                <span className="text-bone-400">STIX 2.1 LIVE REPOSITORY</span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-bone-100 leading-[1.06]">
                TRỰC QUAN HÓA / CHIẾN TRƯỜNG /{' '}
                <span className="italic font-normal text-[#FF5A36]">
                  MITRE ATT&amp;CK®
                </span>
              </h1>

              <p className="text-sm sm:text-base text-bone-300 font-sans leading-relaxed max-w-2xl pt-1">
                Phòng thí nghiệm thực chiến: mổ xẻ bản chất hành vi tấn công từ dữ liệu STIX 2.1 chính thức,
                theo dõi chuỗi xâm nhập có thật qua sơ đồ lộ trình và chuyển hoá tức thì thành chiến lược
                phát hiện{' '}
                <code className="font-mono text-xs font-bold text-defend px-2 py-0.5 border border-defend/30 bg-defend-muted/20 rounded-xs">
                  DET → AN → Data Component
                </code>{' '}
                cho đội ngũ phòng thủ.
              </p>
            </div>

            {/* 3 Nút Hành động Trọng tâm */}
            <div className="flex flex-wrap items-center gap-3 pt-1 font-mono text-xs">
              <Link
                to="/matrix"
                className="inline-flex items-center gap-2.5 rounded-xs bg-[#FF5A36] text-[#0A0C0B] border border-[#FF5A36] px-5 py-3 font-bold hover:bg-[#FF7A00] transition-all shadow-md group"
              >
                <Grid3X3 className="h-4 w-4" />
                <span>Khám phá Ma trận 15 Tactics</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/cases"
                className="inline-flex items-center gap-2.5 rounded-xs border-2 border-line bg-surface-elevated text-bone-100 px-5 py-3 font-semibold hover:border-line-strong hover:bg-surface-subtle transition-all shadow-sm group"
              >
                <PlaySquare className="h-4 w-4 text-attack" />
                <span>Chạy Attack Chain Player</span>
                <ArrowRight className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>

              <button
                type="button"
                onClick={() => setCommandPaletteOpen(true)}
                className="inline-flex items-center gap-2 rounded-xs border-2 border-line bg-surface-elevated px-3.5 py-3 text-bone-400 hover:text-bone-100 hover:border-line-strong transition-colors"
                title="Mở bảng tìm kiếm nhanh"
              >
                <Search className="h-3.5 w-3.5" />
                <span>Tìm nhanh</span>
                <kbd className="rounded-xs border border-line bg-surface px-1.5 py-0.5 text-[10px] text-bone-300">
                  Ctrl + K
                </kbd>
              </button>
            </div>

            {/* Khối Tóm tắt 3 Thay đổi Lớn Kiến trúc ATT&CK (v18 → v20.1) */}
            <div className="border-t border-line pt-5 space-y-3">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-bone-500">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-attack" />
                  <span>// 3 THAY ĐỔI LỚN KIẾN TRÚC ATT&amp;CK (v18 → v{currentVer})</span>
                </span>
                <span className="text-attack font-bold">VITAL NOTES</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-sans text-xs">
                {/* v18+ */}
                <div className="border border-line bg-surface-elevated p-3.5 rounded-xs space-y-1.5 transition-colors hover:border-defend/50">
                  <div className="font-mono text-[10px] font-bold text-defend dark:text-[#00E5A3] uppercase tracking-wider flex items-center gap-1.5">
                    <Radar className="h-3.5 w-3.5" />
                    <span>01 · ATT&amp;CK v18+</span>
                  </div>
                  <div className="text-[12px] font-bold text-bone-100">
                    Detection Engineering mới
                  </div>
                  <p className="text-[11px] text-bone-300 leading-snug">
                    Bỏ Data Source cũ, triển khai chuỗi 3 tầng:{' '}
                    <span className="font-mono text-defend dark:text-[#00E5A3] font-semibold">DET → AN → DC</span>.
                  </p>
                </div>

                {/* v19+ */}
                <div className="border border-line bg-surface-elevated p-3.5 rounded-xs space-y-1.5 transition-colors hover:border-attack/50">
                  <div className="font-mono text-[10px] font-bold text-attack dark:text-[#FF5A36] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldOff className="h-3.5 w-3.5" />
                    <span>02 · ATT&amp;CK v19+</span>
                  </div>
                  <div className="text-[12px] font-bold text-bone-100">
                    Tách đôi Evasion → 15 Tactics
                  </div>
                  <p className="text-[11px] text-bone-300 leading-snug">
                    Tách thành <strong className="text-bone-100">Stealth (TA0005)</strong> &amp;{' '}
                    <strong className="text-bone-100">Defense Impairment (TA0112)</strong>.
                  </p>
                </div>

                {/* v20+ */}
                <div className="border border-line bg-surface-elevated p-3.5 rounded-xs space-y-1.5 transition-colors hover:border-amber-500/50">
                  <div className="font-mono text-[10px] font-bold text-caution dark:text-[#F59E0B] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>03 · ATT&amp;CK v20+</span>
                  </div>
                  <div className="text-[12px] font-bold text-bone-100">
                    Bảo mật AI / LLM &amp; ICS
                  </div>
                  <p className="text-[11px] text-bone-300 leading-snug">
                    Bổ sung kỹ thuật nhắm vào hệ thống AI (Prompt Injection, Exfiltration) &amp; ICS.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: 3D Cyber Defense Polyhedron Canvas (Signature Visual) */}
          <div className="lg:col-span-5">
            <DefensePolyhedronCanvas />
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. LIVE STATS GRID — BẢNG ĐIỀU ĐỘ SỐ LIỆU CHÍNH THỨC TỪ CƠ SỞ DỮ LIỆU STIX
          Lưới kẻ hairline chuẩn hồ sơ kỹ thuật, số liệu tabular lớn, đếm động CountUp
         ========================================================================= */}
      <section aria-label="Số liệu trực tiếp từ cơ sở dữ liệu STIX">
        <div className="border-2 border-line bg-surface rounded-xs overflow-hidden shadow-sm transition-colors">
          <div className="border-b border-line px-4 py-3 flex items-center justify-between font-mono text-[10px] text-bone-500 uppercase tracking-widest bg-surface-subtle">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-defend animate-pulse" />
              <span className="font-bold text-bone-300">
                LIVE REPOSITORY TELEMETRY // REAL DATA VERIFIED
              </span>
            </span>
            <span className="font-semibold text-bone-400">ENTERPRISE DOMAIN · STIX 2.1</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-line">
            {statCards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="p-4 sm:p-5 space-y-2 bg-surface hover:bg-surface-elevated transition-colors"
              >
                <div className="flex items-center justify-between font-mono text-[10px] text-bone-500">
                  <span className="font-bold">{card.num}</span>
                  <span className="text-[9px] uppercase tracking-wider text-attack font-bold px-1.5 py-0.5 border border-attack/30 bg-attack-muted/10 rounded-xs">
                    {card.tag}
                  </span>
                </div>

                <div className="font-display text-3xl sm:text-4xl font-black tracking-tight text-bone-100">
                  <CountUpNumber target={card.value} />
                </div>

                <div className="text-xs font-bold text-bone-200">
                  {card.label}
                </div>

                <div className="text-[11px] text-bone-400 font-mono leading-tight">
                  {card.sub}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. TRỌNG TÂM TRẢI NGHIỆM — CÁC CỬA NGÕ DETECTION ENGINEERING WORKBENCH
          Card phong cách hiện đại với chỉ báo tiến độ, viền sáng và chuyển động mượt
         ========================================================================= */}
      <section aria-label="Bốn cửa ngõ thực chiến chính" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cửa ngõ 1: Rule Explorer */}
        <Link
          to="/rules"
          className="group relative border-2 border-line bg-surface p-5 sm:p-6 rounded-xs hover:border-signal-amber hover:bg-surface-elevated transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-signal-amber uppercase tracking-wider">
                DETECTION // SIGMAHQ
              </span>
              <FileCode2 className="h-4 w-4 text-bone-400 group-hover:text-signal-amber transition-colors" />
            </div>

            <h2 className="font-display text-lg sm:text-xl font-bold text-bone-100 group-hover:text-signal-amber transition-colors">
              Rule Explorer
            </h2>

            <p className="text-xs leading-relaxed text-bone-300">
              Khám phá luật phát hiện chuẩn mở SigmaHQ, phân tích Detection Tree và kiểm tra công thức Machine Learning.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-line flex items-center justify-between font-mono text-xs text-bone-400">
            <span>Chuẩn mở SIEM</span>
            <span className="inline-flex items-center gap-1 font-bold text-signal-amber group-hover:translate-x-1 transition-transform">
              <span>Mở Rules</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>

        {/* Cửa ngõ 2: Agent Telemetry Planner */}
        <Link
          to="/agent"
          className="group relative border-2 border-line bg-surface p-5 sm:p-6 rounded-xs hover:border-defend hover:bg-surface-elevated transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-defend uppercase tracking-wider">
                TELEMETRY // PLANNER
              </span>
              <Sliders className="h-4 w-4 text-bone-400 group-hover:text-defend transition-colors" />
            </div>

            <h2 className="font-display text-lg sm:text-xl font-bold text-bone-100 group-hover:text-defend transition-colors">
              Agent Planner
            </h2>

            <p className="text-xs leading-relaxed text-bone-300">
              Đo lường độ phủ của EDR agent qua 15 Tactics, nhận diện vùng mù và thuật toán gợi ý Greedy Marginal Gain.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-line flex items-center justify-between font-mono text-xs text-bone-400">
            <span>Sysmon, auditd, eBPF</span>
            <span className="inline-flex items-center gap-1 font-bold text-defend group-hover:translate-x-1 transition-transform">
              <span>Đo độ phủ</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>

        {/* Cửa ngõ 3: Case Studies Player */}
        <Link
          to="/cases"
          className="group relative border-2 border-line bg-surface p-5 sm:p-6 rounded-xs hover:border-attack hover:bg-surface-elevated transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-attack uppercase tracking-wider">
                INCIDENTS // ATTACK CHAIN
              </span>
              <PlaySquare className="h-4 w-4 text-bone-400 group-hover:text-attack transition-colors" />
            </div>

            <h2 className="font-display text-lg sm:text-xl font-bold text-bone-100 group-hover:text-attack transition-colors">
              Case Studies
            </h2>

            <p className="text-xs leading-relaxed text-bone-300">
              Tái hiện các chiến dịch SolarWinds, NotPetya, APT32 trên sơ đồ Attack Chain Player góc nhìn tấn công và phòng thủ kép.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-line flex items-center justify-between font-mono text-xs text-bone-400">
            <span>6 Chiến dịch thực tế</span>
            <span className="inline-flex items-center gap-1 font-bold text-attack group-hover:translate-x-1 transition-transform">
              <span>Chạy Player</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>

        {/* Cửa ngõ 4: Learning Path */}
        <Link
          to="/learn"
          className="group relative border-2 border-line bg-surface p-5 sm:p-6 rounded-xs hover:border-caution hover:bg-surface-elevated transition-all flex flex-col justify-between shadow-sm hover:shadow-md"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-caution uppercase tracking-wider">
                CURRICULUM // LỘ TRÌNH ĐỌC
              </span>
              <BookOpen className="h-4 w-4 text-bone-400 group-hover:text-caution transition-colors" />
            </div>

            <h2 className="font-display text-lg sm:text-xl font-bold text-bone-100 group-hover:text-caution transition-colors">
              Lộ Trình Chuyên Sâu
            </h2>

            <p className="text-xs leading-relaxed text-bone-300">
              4 chuyên đề cốt lõi: Telemetry, DET ➔ AN ➔ DC, Viết luật SigmaHQ, và Bảng đối soát Telemetry Windows ↔ Linux.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-line flex items-center justify-between font-mono text-xs text-bone-400">
            <span>Không bài tập · Thực chiến</span>
            <span className="inline-flex items-center gap-1 font-bold text-caution group-hover:translate-x-1 transition-transform">
              <span>Xem giáo trình</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
      </section>

      {/* =========================================================================
          4. PERSONAL BOOKMARKS (DẤU TRANG KỸ THUẬT CỦA BẠN)
         ========================================================================= */}
      {bookmarks.length > 0 && (
        <section
          aria-label="Kỹ thuật đã đánh dấu"
          className="border-2 border-line bg-surface p-5 sm:p-6 rounded-xs space-y-3 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-line pb-2.5">
            <div className="flex items-center gap-2 font-display text-base font-bold text-bone-100">
              <Bookmark className="h-4 w-4 text-attack" />
              <span>Hồ sơ Kỹ thuật đã Đánh dấu ({bookmarks.length})</span>
            </div>
            <span className="font-mono text-[10px] text-bone-500 uppercase font-semibold">
              BẤM ĐỂ MỞ NHANH HỒ SƠ TECHNIQUE
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {bookmarks.slice(0, 16).map((bm) => (
              <button
                key={bm.id}
                type="button"
                onClick={() => openTechnique(bm.attack_id, bm.domain)}
                className="inline-flex items-center gap-1.5 rounded-xs border border-line bg-surface-elevated px-2.5 py-1 font-mono text-xs text-bone-200 hover:border-attack/50 hover:text-attack transition-colors shadow-xs"
              >
                <span className="font-bold text-attack">▲</span>
                <span>{bm.attack_id}</span>
                <span className="text-[10px] text-bone-500">
                  ({bm.domain.replace('-attack', '')})
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
