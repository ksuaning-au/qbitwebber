import { lazy, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { LoginForm } from '@/components/LoginForm'
import { Layout } from '@/components/Layout'
import { TorrentsView } from '@/components/torrents/TorrentsView'
import { PageBoundary } from '@/components/PageBoundary'

// Torrents opens first, so it stays in the main script and the other pages load when opened.
const AddTorrentView = lazy(() => import('@/components/torrents/AddTorrentView').then(m => ({ default: m.AddTorrentView })))
const RSSView = lazy(() => import('@/components/rss/RSSView').then(m => ({ default: m.RSSView })))
const SearchView = lazy(() => import('@/components/search/SearchView').then(m => ({ default: m.SearchView })))
const LogsView = lazy(() => import('@/components/logs/LogsView').then(m => ({ default: m.LogsView })))
const SettingsView = lazy(() => import('@/components/settings/SettingsView').then(m => ({ default: m.SettingsView })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
})

type Tab = 'torrents' | 'add' | 'rss' | 'search' | 'logs' | 'settings'

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('torrents')
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm />
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <PageBoundary key={activeTab}>
        {activeTab === 'torrents' && <TorrentsView />}
        {activeTab === 'add' && <AddTorrentView />}
        {activeTab === 'rss' && <RSSView />}
        {activeTab === 'search' && <SearchView />}
        {activeTab === 'logs' && <LogsView />}
        {activeTab === 'settings' && <SettingsView />}
      </PageBoundary>
    </Layout>
  )
}

// Puts notifications over the top banner, clear of the phone's notch.
const TOAST_OFFSET = { top: 'calc(env(safe-area-inset-top) + 0.125rem)' }

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-center" offset={TOAST_OFFSET} mobileOffset={TOAST_OFFSET} />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
