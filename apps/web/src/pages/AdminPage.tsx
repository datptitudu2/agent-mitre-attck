import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { apiFetch } from '@/lib/api'
import type { AdminHealthResponse, VersionsResponse } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'

export function AdminPage() {
  const profile = useAuthStore((s) => s.profile)
  const qc = useQueryClient()

  const [syncDomain, setSyncDomain] = useState('all')
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'member' | 'admin'>('member')
  const [newNote, setNewNote] = useState('')

  const isAdmin = profile?.role === 'admin'

  const { data: versionsData, isFetching: isCheckingRemote, refetch: refetchVersions } = useQuery({
    queryKey: ['versions', 'remote-admin'],
    enabled: isAdmin,
    queryFn: () => apiFetch<VersionsResponse>('/api/versions?check_remote=true'),
  })

  const { data: healthData, isLoading: isHealthLoading, error: healthError } = useQuery({
    queryKey: ['admin-health'],
    enabled: isAdmin,
    queryFn: () => apiFetch<AdminHealthResponse>('/api/admin/health'),
  })

  const triggerSync = useMutation({
    mutationFn: () =>
      apiFetch<{ status: string; message: string }>('/api/sync', {
        method: 'POST',
        body: JSON.stringify({ domain: syncDomain, version: 'latest' }),
      }),
    onSuccess: (res) => {
      setSyncStatusMsg(res.message)
      void qc.invalidateQueries({ queryKey: ['versions'] })
    },
    onError: (err) => {
      setSyncStatusMsg(err instanceof Error ? err.message : 'Lỗi khi kích hoạt đồng bộ.')
    },
  })

  const addMember = useMutation({
    mutationFn: () =>
      apiFetch('/api/admin/allowlist', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail, role: newRole, note: newNote }),
      }),
    onSuccess: () => {
      setNewEmail('')
      setNewNote('')
      void qc.invalidateQueries({ queryKey: ['admin-health'] })
    },
  })

  const removeMember = useMutation({
    mutationFn: (email: string) =>
      apiFetch(`/api/admin/allowlist/${encodeURIComponent(email)}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-health'] })
    },
  })

  const dbBytes = healthData?.db_storage?.database_bytes ?? 0
  const limitBytes = healthData?.db_storage?.limit_bytes ?? 524_288_000
  const usedPct = Math.min(100, Math.round((dbBytes / limitBytes) * 1000) / 10)

  if (profile && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>System Operations &amp; Content Governance (Admin Only)</span>
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Quản trị Đồng bộ MITRE, Dung lượng DB &amp; Sức khoẻ Nội dung
          </h1>
        </div>

        <button
          type="button"
          onClick={() => void refetchVersions()}
          disabled={isCheckingRemote}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-cyan-500/50 self-start"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isCheckingRemote && 'animate-spin')} />
          <span>Kiểm tra index.json từ MITRE</span>
        </button>
      </div>

      {/* Trạng thái Version từng Domain + Nút Đồng bộ ngay */}
      <div className="glass-card rounded-3xl p-6 space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
              Đối chiếu Phiên bản Dữ liệu (Supabase DB vs MITRE GitHub)
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Tác vụ crawl/parse nặng chạy ngoài Vercel qua GitHub Actions (<code className="font-mono">sync.yml</code>) để đảm bảo ổn định tuyệt đối trên gói miễn phí.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Chọn domain cần đồng bộ"
              value={syncDomain}
              onChange={(e) => setSyncDomain(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="all">Tất cả 3 Domains (all)</option>
              <option value="enterprise-attack">Enterprise ATT&amp;CK</option>
              <option value="mobile-attack">Mobile ATT&amp;CK</option>
              <option value="ics-attack">ICS ATT&amp;CK</option>
            </select>

            <button
              type="button"
              disabled={triggerSync.isPending}
              onClick={() => void triggerSync.mutate()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500 disabled:opacity-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', triggerSync.isPending && 'animate-spin')} />
              <span>Đồng bộ ngay (GitHub Actions)</span>
            </button>
          </div>
        </div>

        {syncStatusMsg && (
          <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/10 p-3.5 text-xs text-cyan-800 dark:text-cyan-200">
            {syncStatusMsg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {(versionsData?.domains ?? []).map((dom) => (
            <div
              key={dom.domain}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase text-cyan-600 dark:text-cyan-400">
                  {dom.domain}
                </span>
                {dom.has_update ? (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-300">
                    Có bản mới v{dom.mitre_latest_version}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Mới nhất
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <div className="text-[11px] text-slate-500">Đang lưu trong DB</div>
                  <div className="font-mono text-xl font-bold text-slate-900 dark:text-white">
                    v{dom.current_version ?? '—'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Trên MITRE index.json</div>
                  <div className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">
                    v{dom.mitre_latest_version ?? dom.current_version ?? '—'}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 font-mono text-[11px] text-slate-500">
                Snapshots diff: {(dom.available_diff_versions ?? []).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {healthError && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-700 dark:text-rose-200">
          {healthError instanceof Error ? healthError.message : 'Lỗi tải thông tin quản trị.'}
        </div>
      )}

      {/* Dung lượng Supabase DB + Kiểm tra Sức khoẻ Nội dung */}
      {isHealthLoading ? (
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
      ) : (
        healthData && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Đồng hồ Dung lượng DB (< 500 MB Supabase Free) */}
            <div className="lg:col-span-5 glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                  <HardDrive className="h-5 w-5 text-cyan-500" />
                  <span>Dung lượng Supabase Postgres</span>
                </div>
                <span className="font-mono text-sm font-bold text-emerald-500">
                  {healthData.db_storage.database_pretty ?? '—'} / 500 MB ({usedPct}%)
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                  style={{ width: `${Math.max(4, usedPct)}%` }}
                />
              </div>

              <div className="space-y-1.5 text-xs">
                {Object.entries(healthData.db_storage.tables ?? {}).map(([tbl, meta]) => (
                  <div
                    key={tbl}
                    className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-900/60 px-3 py-1.5 font-mono text-[11px]"
                  >
                    <span className="text-slate-700 dark:text-slate-300">{tbl}</span>
                    <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                      {meta.pretty}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sức khoẻ Nội dung (Content Health Check) */}
            <div className="lg:col-span-7 glass-card rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
                  <Activity className="h-5 w-5 text-emerald-500" />
                  <span>Kiểm tra Sức khoẻ Nội dung (Cases &amp; Lessons)</span>
                </div>
                <span
                  className={cn(
                    'rounded-full px-3 py-0.5 font-mono text-xs font-bold',
                    healthData.content_health.issue_count === 0
                      ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                      : 'bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-300',
                  )}
                >
                  {healthData.content_health.healthy_count} /{' '}
                  {healthData.content_health.total_references} tham chiếu hợp lệ
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                Đã rà soát tự động <strong>{healthData.content_health.cases_checked}</strong> Case Studies và{' '}
                <strong>{healthData.content_health.lessons_checked}</strong> bài học đối chiếu với phiên bản dữ liệu MITRE hiện hành.
              </p>

              {healthData.content_health.issues.length === 0 ? (
                <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <span>
                    Tuyệt vời! Không có Case Study hay Bài học nào đang tham chiếu tới Technique bị Deprecated, Revoked hoặc không tồn tại.
                  </span>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {healthData.content_health.issues.map((iss, idx) => (
                    <div
                      key={`${iss.source_slug}-${idx}`}
                      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs space-y-1"
                    >
                      <div className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>
                          [{iss.source_kind.toUpperCase()}] {iss.source_title}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200">{iss.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* Quản lý Allowlist Thành viên Nội bộ + Lịch sử sync_runs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5 glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
            <UserPlus className="h-5 w-5 text-violet-500" />
            <span>Allowlist Thành viên Nội bộ (2–10 người)</span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email-thanh-vien@congty.vn"
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <select
                aria-label="Vai trò thành viên"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'member' | 'admin')}
                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-mono text-slate-900 dark:text-white"
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Ghi chú (vd: SOC Analyst)..."
                className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white"
              />
              <button
                type="button"
                disabled={!newEmail.includes('@') || addMember.isPending}
                onClick={() => void addMember.mutate()}
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-45"
              >
                Thêm Email
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(healthData?.allowed_emails ?? []).map((row) => (
              <div
                key={row.email}
                className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3 py-2 text-xs"
              >
                <div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">
                    {row.email}{' '}
                    <span className="ml-1 rounded bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-600 dark:text-cyan-300">
                      {row.role}
                    </span>
                  </div>
                  {row.note && <div className="text-[11px] text-slate-500">{row.note}</div>}
                </div>
                {row.email.toLowerCase() !== profile?.email?.toLowerCase() && (
                  <button
                    type="button"
                    onClick={() => void removeMember.mutate(row.email)}
                    aria-label={`Xoá ${row.email}`}
                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Lịch sử sync_runs */}
        <div className="lg:col-span-7 glass-card rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 font-display text-base font-bold text-slate-900 dark:text-white">
            <Database className="h-5 w-5 text-cyan-500" />
            <span>Nhật ký Đồng bộ Gần đây (sync_runs)</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {(versionsData?.recent_sync_runs ?? []).map((run) => (
              <div
                key={run.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-md px-2 py-0.5 font-mono text-[10px] font-bold uppercase',
                        run.status === 'success'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                          : run.status === 'error'
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300'
                            : 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300',
                      )}
                    >
                      {run.status}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {run.domain} {run.version ? `v${run.version}` : ''}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">
                    {new Date(run.started_at).toLocaleString('vi-VN')} • +{run.added} / ~{run.updated}
                  </span>
                </div>
                {run.log && (
                  <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                    {run.log}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
