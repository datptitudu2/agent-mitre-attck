import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { useAuthStore } from '@/stores/useAuthStore'

const MatrixPage = lazy(() =>
  import('@/pages/MatrixPage').then((m) => ({ default: m.MatrixPage })),
)
const CasesPage = lazy(() =>
  import('@/pages/CasesPage').then((m) => ({ default: m.CasesPage })),
)
const LearnPage = lazy(() =>
  import('@/pages/LearnPage').then((m) => ({ default: m.LearnPage })),
)
const CoveragePage = lazy(() =>
  import('@/pages/CoveragePage').then((m) => ({ default: m.CoveragePage })),
)
const ExplorerPage = lazy(() =>
  import('@/pages/ExplorerPage').then((m) => ({ default: m.ExplorerPage })),
)
const WhatsNewPage = lazy(() =>
  import('@/pages/WhatsNewPage').then((m) => ({ default: m.WhatsNewPage })),
)
const AdminPage = lazy(() =>
  import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 phút vì dữ liệu ATT&CK đổi theo phiên bản
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function RouteLoadingFallback() {
  return (
    <div className="space-y-4 py-4" role="status" aria-label="Đang tải phân hệ">
      <div className="h-24 animate-pulse rounded-3xl bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="h-80 animate-pulse rounded-3xl bg-slate-200/60 dark:bg-slate-800/60" />
    </div>
  )
}

function ProtectedRoutes() {
  const { initialized, session, profile } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center cyber-grid-bg">
        <div className="glass-card rounded-2xl px-6 py-4 text-sm font-mono text-cyan-600 dark:text-cyan-400">
          Đang kiểm tra phiên đăng nhập ATT&amp;CK Lab...
        </div>
      </div>
    )
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />
  }

  return <AppShell />
}

export function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return (
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoutes />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/matrix" element={<MatrixPage />} />
                <Route path="/cases" element={<CasesPage />} />
                <Route path="/learn" element={<LearnPage />} />
                <Route path="/coverage" element={<CoveragePage />} />
                <Route path="/explorer" element={<ExplorerPage />} />
                <Route path="/whats-new" element={<WhatsNewPage />} />
                <Route path="/admin" element={<AdminPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </MotionConfig>
  )
}
