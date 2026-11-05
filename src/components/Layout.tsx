import { useEffect, useRef, useState } from 'react'
import { 
  Download, 
  Server, 
  Search, 
  FileText, 
  Settings,
  Menu,
  X,
  Radio
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatSize } from '@/lib/utils'
import { useTransferInfo } from '@/hooks/useApi'
import { SpeedLimitToggle } from '@/components/SpeedLimitToggle'

type Tab = 'torrents' | 'add' | 'rss' | 'search' | 'logs' | 'settings'

interface LayoutProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: React.ReactNode
}

export function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  // Each page opens at its top instead of where the last one was scrolled to.
  useEffect(() => {
    scrollerRef.current?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [activeTab])
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
    // On phones the page scrolls inside this box rather than the window. When the window scrolls,
    // iPhone Safari hides its toolbar, and the next tap near the bottom edge brings the toolbar
    // back instead of reaching the tab bar.
    <div ref={scrollerRef} className="min-h-screen bg-background max-md:fixed max-md:inset-0 max-md:overflow-y-auto max-md:overscroll-y-contain">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              title={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            {/* Trimmed to the capital letters, so the title centers on them like the icons beside it. */}
            <h1 className="text-xl sm:text-2xl font-semibold whitespace-nowrap [text-box:trim-both_cap_alphabetic]" style={{fontFamily: "Silkscreen"}}>qBittorrent</h1>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-3">
            <SpeedLimitToggle />

            {/* Transfer stats */}
            {transferInfo && (
              <div className="flex flex-col items-end text-[10px] leading-tight whitespace-nowrap sm:flex-row sm:items-center sm:gap-3 sm:text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-green-500">↓</span>
                  <span>{formatSize(transferInfo.dl_info_speed ?? 0)}/s</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-blue-500">↑</span>
                  <span>{formatSize(transferInfo.up_info_speed ?? 0)}/s</span>
                </div>
              </div>
            )}
          </div>
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
        <aside className="hidden md:flex w-48 flex-col border-r p-2 gap-1 sticky top-14 self-start h-[calc(100vh-56px)] overflow-y-auto pb-4">
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
        <main className="flex-1 min-w-0 pt-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-4">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="flex justify-around px-1 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-1 py-1 rounded-md",
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
