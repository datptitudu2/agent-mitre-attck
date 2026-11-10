import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

const KNOWLEDGE_DICTIONARY: Record<
  string,
  { term: string; definition: string; example: string }
> = {
  EDR: {
    term: 'EDR (Endpoint Detection and Response)',
    definition:
      'Hệ thống phần mềm giám sát thường trực tại nhân (kernel) của máy trạm và máy chủ, ghi lại toàn bộ tiến trình, luồng bộ nhớ và kết nối mạng để phát hiện hành vi xâm nhập mà Antivirus truyền thống bỏ lọt.',
    example: 'Microsoft Defender for Endpoint (MDE), CrowdStrike Falcon, SentinelOne.',
  },
  SIEM: {
    term: 'SIEM (Security Information & Event Management)',
    definition:
      'Hệ thống quản lý thông tin và sự kiện an ninh mạng trung tâm, tập hợp toàn bộ log từ máy chủ, tường lửa, đám mây và EDR để tương quan hóa dữ liệu và phát hiện bất thường diện rộng.',
    example: 'Splunk Enterprise Security, Microsoft Sentinel, Elastic SIEM.',
  },
  LotL: {
    term: 'Living off the Land (LotL)',
    definition:
      'Kỹ thuật tấn công tinh vi trong đó kẻ xâm nhập không cài đặt file mã độc ngoại lai, mà tận dụng triệt để các công cụ phần mềm chính chủ có sẵn trong hệ điều hành (PowerShell, Certutil, WMI, BASH).',
    example: 'Kẻ tấn công dùng certutil.exe để tải payload hoặc PowerShell để đọc bộ nhớ.',
  },
  'Parent-Child': {
    term: 'Mối quan hệ Tiến trình Cha–Con (Parent-Child)',
    definition:
      'Liên kết gia phả giữa tiến trình khởi tạo và tiến trình con được sinh ra. Bất thường trong cây tiến trình là một trong những chỉ báo tin cậy nhất của mã độc.',
    example: 'Tệp Word/Excel (EXCEL.EXE) tự động sinh PowerShell hoặc CMD.',
  },
  Sigma: {
    term: 'Sigma Rule (Quy tắc Sigma)',
    definition:
      'Định dạng chữ ký phát hiện mở độc lập với nền tảng SIEM, cho phép đặc tả logic phát hiện tấn công bằng YAML một lần rồi biên dịch sang Splunk SPL, Elastic KQL hoặc Sentinel KQL.',
    example: 'Quy tắc phát hiện PowerShell ẩn cửa sổ chạy được trên mọi SIEM.',
  },
  Entropy: {
    term: 'Entropy Shannon (Độ Hỗn Loạn Chuỗi)',
    definition:
      'Thước đo mức độ ngẫu nhiên của một tập hợp ký tự. Văn bản tiếng Anh tự nhiên có entropy thấp (3.5–4.3), trong khi shellcode, khóa mã hóa và Base64 có entropy rất cao (> 5.2).',
    example: 'Phát hiện PowerShell bị obfuscated hoặc DNS Tunneling subdomain.',
  },
  auditd: {
    term: 'Linux Audit Daemon (auditd)',
    definition:
      'Hệ thống kiểm toán cấp kernel chuẩn của hệ điều hành Linux, theo dõi các lệnh gọi hệ thống (SYSCALL: execve, open, connect, setuid) và truy cập tập tin nhạy cảm.',
    example: 'Bắt quả tang khi có kẻ sửa đổi file /etc/sudoers hoặc chạy curl pipe sh.',
  },
  eBPF: {
    term: 'eBPF (Extended Berkeley Packet Filter)',
    definition:
      'Công nghệ cho phép chạy các chương trình an toàn trực tiếp bên trong Linux kernel mà không cần can thiệp mã nguồn kernel, mang lại khả năng quan sát an ninh không độ trễ cho Container và Kubernetes.',
    example: 'Tetragon, Tracee giám sát thời gian thực các sự kiện process_exec.',
  },
}

interface KnowledgeHovercardProps {
  termKey: keyof typeof KNOWLEDGE_DICTIONARY | string
  children?: React.ReactNode
}

export function KnowledgeHovercard({ termKey, children }: KnowledgeHovercardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const data = KNOWLEDGE_DICTIONARY[termKey]
  if (!data) return <>{children || termKey}</>

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsOpen(true)
  }

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 150)
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span className="cursor-help underline decoration-dashed decoration-signal-amber/60 underline-offset-2 hover:text-signal-amber transition-colors font-medium">
        {children || termKey}
      </span>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 rounded-xl border border-bone-300 dark:border-bone-700 bg-surface-elevated p-3.5 shadow-xl z-50 text-left pointer-events-auto font-sans"
          >
            <div className="flex items-center gap-1.5 border-b border-bone-200 dark:border-bone-800 pb-1.5 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-signal-amber" />
              <span className="font-mono text-xs font-bold text-bone-950 dark:text-bone-50">
                {data.term}
              </span>
            </div>

            <p className="text-xs text-bone-700 dark:text-bone-300 leading-relaxed">
              {data.definition}
            </p>

            <div className="mt-2 pt-2 border-t border-bone-200/60 dark:border-bone-800/60 font-mono text-[11px] text-bone-500 flex items-start gap-1">
              <span className="font-semibold text-bone-600 dark:text-bone-400">Ví dụ:</span>
              <span className="text-bone-700 dark:text-bone-300">{data.example}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
