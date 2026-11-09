import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { AdminPage } from '@/pages/AdminPage'
import { CasesPage } from '@/pages/CasesPage'
import { CoveragePage } from '@/pages/CoveragePage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ExplorerPage } from '@/pages/ExplorerPage'
import { LearnPage } from '@/pages/LearnPage'
import { LoginPage } from '@/pages/LoginPage'
import { MatrixPage } from '@/pages/MatrixPage'
import { WhatsNewPage } from '@/pages/WhatsNewPage'
import { useAuthStore } from '@/stores/useAuthStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 phút vì dữ liệu ATT&CK đổi theo phiên bản
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function ProtectedRoutes() {
  const { initialized, session, profile } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center cyber-grid-bg">
        <div className="glass-card rounded-2xl px-6 py-4 text-sm font-mono text-cyan-400">
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
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
      </BrowserRouter>
    </QueryClientProvider>
  )
}
