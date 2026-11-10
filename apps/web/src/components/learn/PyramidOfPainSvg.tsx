import { useState } from 'react'
import { ShieldCheck, Zap } from 'lucide-react'

interface TierData {
  id: number
  name: string
  shortLabel: string
  painLevel: 'Trivial' | 'Easy' | 'Simple' | 'Annoying' | 'Challenging' | 'Tough'
  painVi: string
  adversaryImpact: string
  defenseRole: string
  example: string
  color: string
  fillNormal: string
  fillActive: string
  fillHover: string
  strokeNormal: string
  strokeActive: string
  textColor: string
  gradientId: string
  gradientColors: [string, string]
}

const PYRAMID_TIERS: TierData[] = [
  {
    id: 6,
    name: 'TTPs (Tactics, Techniques & Procedures)',
    shortLabel: '▲ TTPs (HÀNH VI ATT&CK)',
    painLevel: 'Tough',
    painVi: 'Cực kỳ khó đổi · Đỉnh kim tự tháp',
    adversaryImpact:
      'Kẻ tấn công phải đào tạo lại toàn bộ đội ngũ, viết lại công cụ và thay đổi thói quen hành vi tác chiến từ đầu.',
    defenseRole:
      'Trọng tâm cốt lõi của MITRE ATT&CK và ATT&CK Lab: phát hiện hành vi bản chất (vd: chèn DLL, làm mù log) bất kể kẻ tấn công dùng IP hay mã băm nào.',
    example: 'Process Injection (T1055), Masquerading (T1036), Disable Security Tools (T1562.001)',
    color: '#FF5A36',
    fillNormal: '#DC2626',
    fillActive: '#FF5A36',
    fillHover: '#EF4444',
    strokeNormal: '#991B1B',
    strokeActive: '#FF7A00',
    textColor: '#FFFFFF',
    gradientId: 'grad-ttp',
    gradientColors: ['#EF4444', '#DC2626'],
  },
  {
    id: 5,
    name: 'Tools (Công cụ / Phần mềm)',
    shortLabel: 'Tools (Công cụ)',
    painLevel: 'Challenging',
    painVi: 'Thách thức đối thủ',
    adversaryImpact:
      'Buộc đối phương phải tìm công cụ mới hoặc tự lập trình lại mã nguồn, kiểm thử chống AV/EDR.',
    defenseRole:
      'Phát hiện chữ ký phần mềm, hành vi đặc trưng của tool qua Analytics (AN) và Detection Strategies (DET).',
    example: 'Mimikatz, Cobalt Strike Beacon, PsExec, BloodHound, Chisel',
    color: '#F97316',
    fillNormal: '#EA580C',
    fillActive: '#FB923C',
    fillHover: '#F97316',
    strokeNormal: '#9A3412',
    strokeActive: '#FF7A00',
    textColor: '#FFFFFF',
    gradientId: 'grad-tools',
    gradientColors: ['#F97316', '#EA580C'],
  },
  {
    id: 4,
    name: 'Network / Host Artifacts',
    shortLabel: 'Network / Host Artifacts',
    painLevel: 'Annoying',
    painVi: 'Gây phiền toái & khó chịu',
    adversaryImpact:
      'Đối phương phải cấu hình lại tham số kết nối, user-agent, khoá Registry, tên service/named pipe.',
    defenseRole:
      'Thu thập từ Data Components: Process Creation (DC0032), Network Traffic (DC0062).',
    example: 'Khóa Run Registry, Custom HTTP User-Agent, URI đặc trưng, Named Pipe C2',
    color: '#F59E0B',
    fillNormal: '#D97706',
    fillActive: '#FBBF24',
    fillHover: '#F59E0B',
    strokeNormal: '#B45309',
    strokeActive: '#FF7A00',
    textColor: '#FFFFFF',
    gradientId: 'grad-artifacts',
    gradientColors: ['#F59E0B', '#D97706'],
  },
  {
    id: 3,
    name: 'Domain Names (Tên miền C2)',
    shortLabel: 'Domain Names (Tên miền)',
    painLevel: 'Simple',
    painVi: 'Đơn giản để vượt qua',
    adversaryImpact:
      'Kẻ tấn công mất vài USD và 2–5 phút để mua domain mới hoặc tạo DGA (Domain Generation Algorithm).',
    defenseRole:
      'Cảnh báo qua DNS Query logs, nhưng không thể chặn triệt để nếu đối thủ đổi domain liên tục.',
    example: 'update-microsoft-support[.]com, dynamic DNS, Cloudflare Worker endpoints',
    color: '#10B981',
    fillNormal: '#059669',
    fillActive: '#34D399',
    fillHover: '#10B981',
    strokeNormal: '#047857',
    strokeActive: '#FF7A00',
    textColor: '#FFFFFF',
    gradientId: 'grad-domains',
    gradientColors: ['#10B981', '#059669'],
  },
  {
    id: 2,
    name: 'IP Addresses (Địa chỉ IP)',
    shortLabel: 'IP Addresses (Địa chỉ IP)',
    painLevel: 'Easy',
    painVi: 'Rất dễ thay đổi',
    adversaryImpact:
      'Kẻ tấn công chỉ cần đổi IP proxy, bật mạng VPN, hoặc xoay vòng botnet trong tích tắc.',
    defenseRole:
      'IP blacklist/blocklist chỉ có tác dụng tức thời vài giờ đến vài ngày.',
    example: '198.51.100.24, TOR exit nodes, compromised VPS hosts',
    color: '#0EA5E9',
    fillNormal: '#0284C7',
    fillActive: '#38BDF8',
    fillHover: '#0EA5E9',
    strokeNormal: '#0369A1',
    strokeActive: '#FF7A00',
    textColor: '#FFFFFF',
    gradientId: 'grad-ips',
    gradientColors: ['#0EA5E9', '#0284C7'],
  },
  {
    id: 1,
    name: 'Hash Values (Mã băm SHA-256 / MD5)',
    shortLabel: 'Hash Values (Mã băm)',
    painLevel: 'Trivial',
    painVi: 'Tầm thường · Dễ đổi nhất (Đáy)',
    adversaryImpact:
      'Chỉ cần thêm 1 byte rác (junk byte) hoặc recompile, mã băm lập tức thay đổi hoàn toàn.',
    defenseRole:
      'Hash chỉ dùng để nhận diện tệp đã biết chính xác 100%, không phát hiện được biến thể mới.',
    example: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    color: '#6366F1',
    fillNormal: '#4F46E5',
    fillActive: '#818CF8',
    fillHover: '#6366F1',
    strokeNormal: '#4338CA',
    strokeActive: '#FF7A00',
    textColor: '#FFFFFF',
    gradientId: 'grad-hash',
    gradientColors: ['#6366F1', '#4F46E5'],
  },
]

export function PyramidOfPainSvg() {
  const [selectedId, setSelectedId] = useState<number>(6) // Default: TTPs
  const [hoveredId, setHoveredId] = useState<number | null>(null)

  const activeTier = PYRAMID_TIERS.find((t) => t.id === selectedId) ?? PYRAMID_TIERS[0]

  // Geometry: Đỉnh tháp tại (cx=240, topY=25), đáy tại y=325
  const cx = 240
  const tierHeight = 50
  const topY = 25

  const tierPolygons = PYRAMID_TIERS.map((tier, index) => {
    const yTop = topY + index * tierHeight
    const yBottom = yTop + tierHeight
    const wTop = (index / 6) * 220
    const wBottom = ((index + 1) / 6) * 220

    const points =
      index === 0
        ? `${cx},${yTop} ${cx + wBottom},${yBottom} ${cx - wBottom},${yBottom}`
        : `${cx - wTop},${yTop} ${cx + wTop},${yTop} ${cx + wBottom},${yBottom} ${cx - wBottom},${yBottom}`

    const midY = (yTop + yBottom) / 2

    return {
      tier,
      points,
      midY,
      yTop,
      yBottom,
      wBottom,
    }
  })

  return (
    <div className="border-2 border-line bg-surface-elevated p-5 sm:p-6 rounded-xs space-y-5 text-bone-100 font-sans shadow-sm">
      {/* Header Sơ đồ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-line pb-3.5 gap-2">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-attack font-bold">
            <Zap className="h-3.5 w-3.5" />
            <span>SƠ ĐỒ LÝ THUYẾT NỀN TẢNG // DAVID BIANCO (2013)</span>
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-bone-100 mt-0.5">
            Kim Tự Tháp Nỗi Đau (Pyramid of Pain)
          </h3>
        </div>
        <div className="font-mono text-xs text-bone-300 bg-surface px-3 py-1.5 border border-line rounded-xs">
          Mục tiêu phòng thủ: <span className="font-bold text-attack">Leo lên đỉnh TTPs</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Cột trái: Sơ đồ SVG Tam giác 6 tầng màu sắc rõ rệt + vành cam rực rỡ */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <svg
            viewBox="0 0 520 360"
            className="w-full max-w-[500px] h-auto select-none overflow-visible"
            aria-label="Sơ đồ kim tự tháp nỗi đau gồm 6 tầng từ Hash đến TTPs"
          >
            <defs>
              {PYRAMID_TIERS.map((t) => (
                <linearGradient key={t.gradientId} id={t.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={t.gradientColors[0]} />
                  <stop offset="100%" stopColor={t.gradientColors[1]} />
                </linearGradient>
              ))}
            </defs>

            {/* Trục chỉ hướng mũi tên Nỗi đau tăng dần bên trái */}
            <g className="select-none">
              <line
                x1="26"
                y1="325"
                x2="26"
                y2="42"
                stroke="#FF5A36"
                strokeWidth="2.5"
                strokeDasharray="4 3"
              />
              <polygon points="26,24 20,42 32,42" fill="#FF5A36" />
              <text
                x="14"
                y="185"
                fontSize="10"
                fontFamily="IBM Plex Mono, monospace"
                fill="#FF5A36"
                fontWeight="bold"
                transform="rotate(-90 14 185)"
                textAnchor="middle"
                letterSpacing="0.14em"
              >
                NỖI ĐAU ĐỐI THỦ TĂNG DẦN ▲
              </text>
            </g>

            {/* 6 Tầng kim tự tháp — Màu sắc rõ nét từng tầng + Vành cam rực rỡ khi ấn */}
            {tierPolygons.map(({ tier, points, midY, wBottom }) => {
              const isSelected = tier.id === selectedId
              const isHovered = tier.id === hoveredId

              return (
                <g
                  key={tier.id}
                  onClick={() => setSelectedId(tier.id)}
                  onMouseEnter={() => setHoveredId(tier.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="cursor-pointer group focus:outline-none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedId(tier.id)
                    }
                  }}
                  aria-label={`${tier.name} - Mức độ: ${tier.painLevel}`}
                >
                  {/* VÀNH CAM RỰC RỠ BÊN NGOÀI KHI ĐƯỢC CHỌN (Glow halo) */}
                  {isSelected && (
                    <polygon
                      points={points}
                      fill="none"
                      stroke="#FF5A36"
                      strokeWidth="7"
                      strokeOpacity="0.85"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Khối đa giác tầng chính — Màu đặc rực rỡ (Solid vibrant gradient) */}
                  <polygon
                    points={points}
                    fill={isSelected ? tier.fillActive : isHovered ? tier.fillHover : `url(#${tier.gradientId})`}
                    stroke={isSelected ? '#FFFFFF' : '#141412'}
                    strokeWidth={isSelected ? '2.5' : '1.2'}
                    strokeLinejoin="round"
                    className="transition-colors duration-150"
                  />

                  {/* Vành cam viền nét đứt bên trong khi được chọn */}
                  {isSelected && (
                    <polygon
                      points={points}
                      fill="none"
                      stroke="#FF7A00"
                      strokeWidth="2"
                      strokeDasharray="5 3"
                      strokeLinejoin="round"
                      className="pointer-events-none"
                    />
                  )}

                  {/* Nhãn chữ trên tầng — Font to rõ ràng màu trắng tương phản cao */}
                  <text
                    x={cx}
                    y={midY + 5}
                    textAnchor="middle"
                    fontSize={tier.id === 6 ? '11' : '11'}
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="bold"
                    fill="#FFFFFF"
                    style={{
                      filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.95))',
                    }}
                    className="pointer-events-none transition-colors select-none"
                  >
                    {tier.id === 6 ? '▲ TTPs (Hành vi)' : tier.shortLabel}
                  </text>

                  {/* Mũi tên và chỉ báo "ĐANG CHỌN" bên phải ngoài cùng (không đè nhãn) */}
                  {isSelected && (
                    <g className="pointer-events-none">
                      <polygon
                        points={`400,${midY} 410,${midY - 6} 410,${midY + 6}`}
                        fill="#FF5A36"
                      />
                      <rect
                        x="412"
                        y={midY - 11}
                        width="84"
                        height="22"
                        rx="3"
                        fill="#FF5A36"
                      />
                      <text
                        x="454"
                        y={midY + 4}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight="bold"
                        fill="#FFFFFF"
                      >
                        ĐANG CHỌN
                      </text>
                      {/* Đường gióng ngang từ mép tầng tới nhãn chỉ báo */}
                      <line
                        x1={cx + wBottom + 6}
                        y1={midY}
                        x2="396"
                        y2={midY}
                        stroke="#FF5A36"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />
                    </g>
                  )}
                </g>
              )
            })}
          </svg>

          <div className="font-mono text-[11px] text-bone-400 mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-attack animate-ping" />
            <span>[ BẤM VÀO TỪNG TẦNG ĐỂ XEM MỨC ĐỘ NỖI ĐAU CỦA ĐỐI THỦ ]</span>
          </div>
        </div>

        {/* Cột phải: Bảng Thuyết minh Chi tiết Tầng đang chọn với Vành Cam rực rỡ */}
        <div className="lg:col-span-5">
          <div
            className="border-2 rounded-xs p-5 space-y-4 bg-surface transition-all duration-200 ring-2 ring-attack/40 ring-offset-2 ring-offset-surface shadow-md"
            style={{ borderColor: activeTier.color }}
          >
            {/* Header Thẻ: Mức độ Nỗi đau */}
            <div className="flex items-center justify-between border-b border-line pb-3">
              <span
                className="font-mono text-xs uppercase font-bold px-2.5 py-1 rounded-xs border flex items-center gap-1.5"
                style={{
                  color: activeTier.color,
                  borderColor: activeTier.color,
                  backgroundColor: `${activeTier.color}22`,
                }}
              >
                <span>TẦNG {activeTier.id} // {activeTier.painLevel.toUpperCase()}</span>
              </span>
              <span className="font-mono text-[11px] text-bone-400">
                {activeTier.painVi}
              </span>
            </div>

            {/* Tên Tầng */}
            <div>
              <h4 className="font-display text-lg sm:text-xl font-bold text-bone-100">
                {activeTier.name}
              </h4>
            </div>

            {/* Tác động đến Kẻ tấn công (Nỗi đau) */}
            <div className="space-y-1">
              <div className="font-mono text-[10px] uppercase font-bold text-attack tracking-wider">
                ▼ Tác động tới Kẻ tấn công (Adversary Cost):
              </div>
              <p className="text-xs text-bone-200 leading-relaxed font-sans">
                {activeTier.adversaryImpact}
              </p>
            </div>

            {/* Trọng tâm Phòng thủ của ATT&CK Lab */}
            <div className="space-y-1 pt-1 border-t border-line">
              <div className="font-mono text-[10px] uppercase font-bold text-defend tracking-wider flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Góc nhìn Phòng thủ &amp; ATT&amp;CK Lab:</span>
              </div>
              <p className="text-xs text-bone-300 leading-relaxed font-sans">
                {activeTier.defenseRole}
              </p>
            </div>

            {/* Ví dụ Điển hình */}
            <div className="bg-surface-subtle p-3 rounded-xs border border-line space-y-1 font-mono text-[11px]">
              <div className="text-[10px] text-bone-400 uppercase tracking-wide">
                Ví dụ điển hình:
              </div>
              <div className="text-bone-100 font-semibold break-words">
                {activeTier.example}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
