import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Cpu,
  FileCode2,
  Layers,
  Lightbulb,
  Radar,
  Sliders,
  Terminal,
} from 'lucide-react'
import { PyramidOfPainSvg } from '@/components/learn/PyramidOfPainSvg'
import { TelemetryComparisonTable } from '@/components/telemetry/TelemetryComparisonTable'
import { KnowledgeHovercard } from '@/components/common/KnowledgeHovercard'

function VersionEvolutionSlider() {
  const [step, setStep] = useState<0 | 1 | 2>(2)

  const milestones = [
    {
      ver: 'v18',
      date: '10/2025',
      title: 'Tái cấu trúc Detection Engineering',
      tacticCount: 14,
      splitTactic: false,
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
      highlights: [
        'Defense Evasion bị tách thành Stealth (TA0005 — Ẩn mình) và Defense Impairment (TA0112 — Vô hiệu hoá phòng thủ).',
        'Ma trận Enterprise chính thức có 15 cột Tactic thay vì 14.',
        'Mobile ATT&CK lần đầu tiên có bộ Detection Strategies chuẩn hoá.',
      ],
    },
    {
      ver: 'v20 / v20.1',
      date: '10–11/2026',
      title: 'Kỷ nguyên AI & Detection Graph',
      tacticCount: 15,
      splitTactic: true,
      highlights: [
        'Mô hình đối tượng STIX 2.1 kết nối đầy đủ log_source_references.',
        'Hỗ trợ đặc tả luật phát hiện an ninh chuẩn mở độc lập nền tảng SIEM.',
        'Đặc trưng hóa phát hiện hành vi bằng Machine Learning (Entropy & Graph Analysis).',
      ],
    },
  ]

  const active = milestones[step]

  return (
    <div className="rounded-2xl border border-bone-300 dark:border-bone-800 bg-bone-100/60 dark:bg-bone-950/80 p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-bone-200 dark:border-bone-800 pb-3">
        <div>
          <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-signal-amber font-semibold">
            <Radar className="h-4 w-4" />
            <span>Tiến Trình Tiến Hóa // MITRE ATT&CK Roadmap</span>
          </div>
          <h3 className="font-serif text-xl font-normal text-bone-950 dark:text-bone-50 tracking-tight mt-0.5">
            Dòng Thời Gian Thay Đổi Cấu Trúc (v18 ➔ v19 ➔ v20.1)
          </h3>
        </div>

        <div className="inline-flex rounded-lg border border-bone-300 dark:border-bone-700 p-0.5 bg-bone-200/50 dark:bg-bone-900/50 font-mono text-xs">
          {milestones.map((m, idx) => (
            <button
              key={m.ver}
              type="button"
              onClick={() => setStep(idx as 0 | 1 | 2)}
              className={`px-3 py-1 rounded font-bold transition-colors ${
                step === idx
                  ? 'bg-signal-amber text-black'
                  : 'text-bone-600 dark:text-bone-400 hover:text-bone-900 dark:hover:text-bone-200'
              }`}
            >
              {m.ver}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-8 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-bone-500 font-semibold">{active.date}</span>
            <span className="text-bone-400">·</span>
            <span className="font-sans font-bold text-base text-bone-900 dark:text-bone-100">
              {active.title}
            </span>
          </div>

          <ul className="space-y-1.5 text-xs text-bone-700 dark:text-bone-300 font-sans leading-relaxed">
            {active.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-signal-amber font-bold shrink-0">✓</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:col-span-4 p-4 rounded-xl border border-bone-300/80 dark:border-bone-800 bg-bone-200/40 dark:bg-bone-900/40 font-mono text-xs space-y-2 text-center">
          <span className="text-bone-500 text-[10px] uppercase font-bold">Số lượng Tactics</span>
          <div className="text-3xl font-bold text-signal-amber">{active.tacticCount} Cột</div>
          <div className="text-[11px] text-bone-600 dark:text-bone-400">
            {active.splitTactic
              ? 'Đã tách đôi: Stealth (TA0005) & Defense Impairment (TA0112)'
              : 'Enterprise 14 Tactics truyền thống'}
          </div>
        </div>
      </div>
    </div>
  )
}

const CURRICULUM_MODULES = [
  {
    num: '01',
    title: 'Hạ Tầng Telemetry & Nguồn Dữ Liệu Thực Chiến',
    desc: 'So sánh cơ chế thu thập giữa kernel-space (Sysmon, eBPF) và user-space. Cách cấu hình auditd trên Linux và Windows Event Forwarding (WEF) cho doanh nghiệp lớn.',
    readTime: '15 phút đọc',
    topics: ['Windows Security 4688 vs Sysmon 1', 'Linux auditd SYSCALL vs eBPF Tetragon', 'Zeek L7 Protocol Metadata'],
    link: '/agent',
    actionText: 'Mở Telemetry Planner',
    icon: Sliders,
  },
  {
    num: '02',
    title: 'Mô Hình 3 Tầng Detection Engineering (DET ➔ AN ➔ DC)',
    desc: 'Nắm vững kiến trúc mới từ MITRE v18+: Khai tử văn bản Detections tự do, thay bằng Detection Strategy tổng quát, Analytic thực thi và Data Component xác thực.',
    readTime: '12 phút đọc',
    topics: ['Cấu trúc STIX 2.1 của Detection Strategy', 'Mutable Elements: Tinh chỉnh tham số theo môi trường', 'Phân cấp quan hệ detects'],
    link: '/matrix',
    actionText: 'Khám phá Ma trận v20.1',
    icon: Layers,
  },
  {
    num: '03',
    title: 'Kỹ Thuật Viết Luật Phát Hiện Chuẩn Mở với SigmaHQ',
    desc: 'Cách xây dựng các quy tắc Sigma kháng né tránh (resilient detection). Loại bỏ regex giòn dễ gãy, thay bằng phát hiện hành vi cặp cha-con và cờ thực thi cốt lõi.',
    readTime: '18 phút đọc',
    topics: ['Cấu trúc một rule Sigma chuẩn', 'Tối ưu hóa True Positive và giảm nhiễu False Positive', 'Biên dịch Sigma sang Splunk/Elastic/Sentinel'],
    link: '/rules',
    actionText: 'Mở Rule Explorer',
    icon: FileCode2,
  },
  {
    num: '04',
    title: 'Phát Hiện Bất Thường Dựa Trên Machine Learning',
    desc: 'Ứng dụng các thuật toán học máy để bắt các cuộc tấn công không có chữ ký cố định: tính toán Shannon Entropy tham số, mô hình xác suất Bigram cây tiến trình và DNS Tunneling.',
    readTime: '20 phút đọc',
    topics: ['Shannon Entropy tham số dòng lệnh', 'Bigram Process Tree Rarity Model (Laplace smoothing)', 'Phân loại DNS Tunneling qua Google Colab'],
    link: '/rules',
    actionText: 'Xem ML Recipes & Colab',
    icon: Cpu,
  },
]

export function LearnPage() {
  return (
    <div className="space-y-10 pb-16">
      {/* Header */}
      <div className="border-b border-bone-300/80 dark:border-bone-800 pb-5">
        <div className="flex items-center gap-2 mb-1.5 font-mono text-xs text-signal-amber uppercase tracking-wider font-semibold">
          <BookOpen className="h-4 w-4" />
          <span>Curriculum // Detection Engineering Studio</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-normal text-bone-950 dark:text-bone-50 tracking-tight">
          Lộ Trình Đọc Chuyên Sâu Kỹ Sư Phát Hiện
        </h1>
        <p className="mt-1 text-sm text-bone-600 dark:text-bone-400 font-sans max-w-3xl">
          Tài liệu chuẩn mực dành cho chuyên viên phân tích SOC và Detection Engineer. Tập trung vào{' '}
          <strong className="text-bone-900 dark:text-bone-200">
            Tri thức thực chiến, Bản chất hành vi và Công cụ kỹ thuật
          </strong>
          . Trang bị kiến thức từ cảm biến <KnowledgeHovercard termKey="EDR">EDR</KnowledgeHovercard> và{' '}
          <KnowledgeHovercard termKey="SIEM">SIEM</KnowledgeHovercard> đến luật{' '}
          <KnowledgeHovercard termKey="Sigma">Sigma</KnowledgeHovercard> và tính toán{' '}
          <KnowledgeHovercard termKey="Entropy">Entropy</KnowledgeHovercard>. Hoàn toàn không bài tập trắc nghiệm, không chấm điểm, không giới hạn tiến độ.
        </p>
      </div>

      {/* 1. Evolution Timeline */}
      <VersionEvolutionSlider />

      {/* 2. Side-by-side Windows vs Linux Telemetry Table */}
      <TelemetryComparisonTable />

      {/* 3. 4 Chuyên đề cốt lõi */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-bone-200 dark:border-bone-800 pb-2">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-signal-amber font-bold">
            <Terminal className="h-4 w-4" />
            <span>4 Chuyên Đề Cốt Lõi (Detection Engineering Curricula)</span>
          </div>
          <span className="font-mono text-xs text-bone-500">Đọc độc lập hoặc theo chuỗi</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CURRICULUM_MODULES.map((m) => {
            const Icon = m.icon
            return (
              <div
                key={m.num}
                className="p-5 rounded-2xl border border-bone-300 dark:border-bone-800 bg-bone-100/50 dark:bg-bone-950/70 space-y-3.5 flex flex-col justify-between hover:border-bone-400 dark:hover:border-bone-700 transition-colors shadow-sm"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="px-2 py-0.5 rounded font-bold bg-signal-amber/15 text-signal-amber border border-signal-amber/30">
                      CHUYÊN ĐỀ {m.num}
                    </span>
                    <span className="text-bone-500">{m.readTime}</span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-bone-900 dark:text-bone-100 leading-snug">
                    {m.title}
                  </h3>

                  <p className="text-xs text-bone-600 dark:text-bone-400 font-sans leading-relaxed">
                    {m.desc}
                  </p>

                  <div className="pt-2 border-t border-bone-200 dark:border-bone-800/80 space-y-1">
                    <span className="font-mono text-[10px] uppercase font-bold text-bone-500">
                      Chủ đề bao quát:
                    </span>
                    <ul className="text-xs font-mono text-bone-700 dark:text-bone-300 space-y-0.5">
                      {m.topics.map((t, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="text-signal-amber text-xs">•</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Link
                  to={m.link}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-bone-200 dark:bg-bone-900 hover:bg-signal-amber hover:text-black font-mono text-xs font-semibold text-bone-800 dark:text-bone-200 transition-all border border-bone-300 dark:border-bone-700"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{m.actionText}</span>
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {/* 4. Pyramid of Pain Visual Guide */}
      <div className="space-y-3 pt-4 border-t border-bone-300/80 dark:border-bone-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-signal-amber font-bold">
            <Lightbulb className="h-4 w-4" />
            <span>Nguyên Lý Pyramid of Pain (David Bianco)</span>
          </div>
          <span className="font-mono text-xs text-bone-500">Từ Hash đến TTPs</span>
        </div>

        <PyramidOfPainSvg />
      </div>
    </div>
  )
}
