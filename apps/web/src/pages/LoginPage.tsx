import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  KeyRound,
  Lock,
  Mail,
  Moon,
  Network,
  Shield,
  Sun,
} from 'lucide-react'
import { isSupabaseFrontendConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/stores/useAuthStore'
import { useThemeStore } from '@/stores/useThemeStore'
import { MitreFooter } from '@/components/layout/MitreFooter'

const PREVIEW_CHAIN = [
  { id: 'TA0001', tactic: 'Initial Access', tech: 'Phishing / Supply Chain', tone: 'cyan' },
  { id: 'TA0005', tactic: 'Stealth (v19+)', tech: 'Obfuscated Files & Masquerading', tone: 'violet' },
  { id: 'TA0112', tactic: 'Defense Impairment', tech: 'Impair Defenses / Disable Logs', tone: 'crimson' },
  { id: 'DET → AN', tactic: 'Detection Strategy', tech: 'Analytic → Data Component', tone: 'emerald' },
]

export function LoginPage() {
  const { session, profile, loading, error, signInWithPassword, clearError } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (session && profile) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    clearError()
    await signInWithPassword(email, password)
  }

  return (
    <div className="min-h-screen flex flex-col justify-between cyber-grid-bg relative overflow-hidden">
      {/* Hào quang nền tinh tế */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 right-1/5 h-96 w-96 rounded-full bg-violet-500/15 blur-3xl"
      />

      {/* Thanh trên cùng */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/25 border border-cyan-500/40 shadow-neon-cyan">
            <Shield className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              ATT&amp;CK <span className="text-cyan-500">Lab</span>
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Không gian học tập nội bộ • MITRE ATT&amp;CK®
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Chuyển đổi giao diện Sáng / Tối"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-cyan-500/50 transition-colors"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="h-4 w-4 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4 text-violet-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Khu vực trung tâm 2 cột */}
      <main className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 py-8 lg:grid-cols-12">
        {/* Cột trái: Giới thiệu trực quan */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="lg:col-span-7 space-y-6"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
            <Network className="h-3.5 w-3.5" />
            <span>Trực quan hoá STIX 2.1 Chính thức • Cập nhật tự động</span>
          </div>

          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Học MITRE ATT&amp;CK qua{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 bg-clip-text text-transparent">
              chuỗi tấn công thực tế
            </span>{' '}
            &amp; tư duy phòng thủ.
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Khám phá toàn bộ ma trận <strong>Enterprise (15 Tactics)</strong>, <strong>Mobile</strong> và{' '}
            <strong>ICS</strong>, theo dõi từng bước diễn biến chiến dịch với công tắc{' '}
            <em>Attacker ⇄ Defender</em> và làm chủ mô hình phát hiện mới{' '}
            <code className="rounded bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-xs text-cyan-600 dark:text-cyan-300">
              Detection Strategy → Analytic → Data Component
            </code>
            .
          </p>

          {/* Sơ đồ mini minh hoạ */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {PREVIEW_CHAIN.map((item) => (
              <div
                key={item.id}
                className="glass-card rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    {item.id}
                  </span>
                  <Eye className="h-3.5 w-3.5 text-slate-400" />
                </div>
                <div className="mt-1 font-display text-sm font-semibold text-slate-900 dark:text-white">
                  {item.tactic}
                </div>
                <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{item.tech}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Chỉ dành cho thành viên trong Allowlist
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              100% Giáo dục phòng thủ (không chứa exploit/payload)
            </span>
          </div>
        </motion.section>

        {/* Cột phải: Thẻ Đăng nhập */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="lg:col-span-5"
        >
          <div className="glass-card rounded-3xl p-7 sm:p-8 shadow-2xl shadow-cyan-950/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-500">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                  Đăng nhập Nội bộ
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                   Xác thực qua Supabase Auth + Kiểm tra Allowlist
                </p>
              </div>
            </div>

            {!isSupabaseFrontendConfigured && (
              <div
                role="status"
                className="mb-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs leading-relaxed text-amber-800 dark:text-amber-200"
              >
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Chưa kết nối biến môi trường Supabase (.env.local)</span>
                </div>
                Hãy chạy file{' '}
                <code className="font-mono">supabase/migrations/0001_init_attack_lab.sql</code> trên
                Supabase SQL Editor và điền <code className="font-mono">VITE_SUPABASE_URL</code>,{' '}
                <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> vào{' '}
                <code className="font-mono">.env.local</code>.
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-200"
              >
                {error}
              </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Email thành viên (trong Allowlist)
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@nhom-bao-mat.vn"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/80 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Mật khẩu
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/80 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500 disabled:opacity-60 transition-all"
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập vào ATT&CK Lab'}
              </button>
            </form>

            <div className="mt-5 border-t border-slate-200/80 dark:border-slate-800/80 pt-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              Đăng ký tự do (Public Signup) đã được tắt. Liên hệ quản trị viên nhóm để thêm email vào
              bảng <code className="font-mono text-cyan-600 dark:text-cyan-400">allowed_emails</code>{' '}
              và cấp mật khẩu truy cập.
            </div>
          </div>
        </motion.section>
      </main>

      <MitreFooter />
    </div>
  )
}

