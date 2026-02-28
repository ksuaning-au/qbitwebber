import { useState } from 'react'
import { 
  Download, 
  Server, 
  Search, 
  FileText, 
  Settings,
  Menu,
  X,
  Home,
  Radio
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useTransferInfo } from '@/hooks/useApi'

type Tab = 'torrents' | 'add' | 'rss' | 'search' | 'logs' | 'settings'

interface LayoutProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: React.ReactNode
}

export function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { logout, host } = useAuth()
  const { data: transferInfo } = useTransferInfo()

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'torrents', label: 'Torrents', icon: <Download className="h-5 w-5" /> },
    { id: 'add', label: 'Add', icon: <Server className="h-5 w-5" /> },
    { id: 'rss', label: 'RSS', icon: <Radio className="h-5 w-5" /> },
    { id: 'search', label: 'Search', icon: <Search className="h-5 w-5" /> },
    { id: 'logs', label: 'Logs', icon: <FileText className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-lg font-semibold hidden sm:block">qBittorrent</h1>
            <span className="text-xs text-muted-foreground hidden md:inline">
              {host.replace(/^https?:\/\//, '')}
            </span>
          </div>
          
          {/* Transfer stats */}
          {transferInfo && (
            <div className="flex items-center gap-3 text-xs">
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-green-500">↓</span>
                <span>{(transferInfo.dl_info_speed / 1024).toFixed(1)} KB/s</span>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                <span className="text-blue-500">↑</span>
                <span>{(transferInfo.up_info_speed / 1024).toFixed(1)} KB/s</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t">
            <nav className="flex flex-col p-2">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                  className="justify-start gap-2"
                  onClick={() => {
                    onTabChange(tab.id)
                    setMobileMenuOpen(false)
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </Button>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Desktop sidebar + main content */}
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-48 flex-col border-r p-2 gap-1">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'secondary' : 'ghost'}
              className="justify-start gap-2"
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </Button>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur">
        <div className="flex justify-around py-2">
          {tabs.slice(0, 5).map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 rounded-md",
                activeTab === tab.id ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon}
              <span className="text-[10px]">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
