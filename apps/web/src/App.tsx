import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { PlaceholderShellPage } from '@/pages/PlaceholderShellPage'
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
            <Route
              path="/"
              element={
                <PlaceholderShellPage
                  title="Tổng quan ATT&CK Lab"
                  phaseNote="Khung xác thực & bảo vệ Route nội bộ đã sẵn sàng (Phase 1). Bảng điều khiển số liệu live sẽ hiển thị ở Phase 3 sau khi đồng bộ STIX ở Phase 2."
                />
              }
            />
            <Route
              path="/matrix"
              element={
                <PlaceholderShellPage
                  title="Matrix Explorer"
                  phaseNote="Sẽ hoàn thiện ở Phase 3 ngay sau khi đồng bộ dữ liệu STIX 2.1 ở Phase 2."
                />
              }
            />
            <Route
              path="/cases"
              element={
                <PlaceholderShellPage
                  title="Case Studies & Attack Chain Player"
                  phaseNote="Sẽ triển khai ở Phase 4."
                />
              }
            />
            <Route
              path="/learn"
              element={
                <PlaceholderShellPage
                  title="Learning Path"
                  phaseNote="Sẽ triển khai ở Phase 5."
                />
              }
            />
            <Route
              path="/coverage"
              element={
                <PlaceholderShellPage
                  title="Coverage Lab"
                  phaseNote="Sẽ triển khai ở Phase 6."
                />
              }
            />
            <Route
              path="/explorer"
              element={
                <PlaceholderShellPage
                  title="Groups, Software & Campaigns"
                  phaseNote="Sẽ triển khai ở Phase 6."
                />
              }
            />
            <Route
              path="/whats-new"
              element={
                <PlaceholderShellPage
                  title="Có gì mới giữa các phiên bản"
                  phaseNote="Sẽ triển khai ở Phase 5."
                />
              }
            />
            <Route
              path="/admin"
              element={
                <PlaceholderShellPage
                  title="Quản trị Đồng bộ & Sức khoẻ Nội dung"
                  phaseNote="Sẽ triển khai ở Phase 6."
                />
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
