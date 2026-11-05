import { useState, type FormEvent, type ReactNode } from 'react'
import { Download, ExternalLink, Folder, FolderPlus, MoreVertical, Plus, RefreshCw, Rss } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRSSFeeds, useRSSItems } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'
import { getRSSParent, joinRSSPath } from '@/lib/rss'
import type { RSSFeed } from '@/types'
import { RSSRules } from './RSSRules'

const selectClass = 'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-2 text-sm'
const nameOf = (path: string) => path.split('\\').pop() ?? path

// One dialog covers every action that needs typing or choosing something.
type Prompt =
  | { kind: 'addFeed' }
  | { kind: 'addFolder' }
  | { kind: 'rename'; path: string; isFolder: boolean }
  | { kind: 'move'; path: string }
  | { kind: 'url'; feed: RSSFeed }
  | { kind: 'interval'; feed: RSSFeed }
  | { kind: 'remove'; path: string; isFolder: boolean }

function useRSSAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ work }: { work: () => Promise<unknown>; done: string; failed: string }) => work(),
    onSuccess: (_result, { done }) => {
      toast.success(done)
      queryClient.invalidateQueries({ queryKey: ['rss'] })
    },
    onError: (error, { failed }) => toast.error(failed, { description: error instanceof Error ? error.message : undefined }),
  })
}

function PromptDialog({ prompt, folders, onClose }: { prompt: Prompt; folders: string[]; onClose: () => void }) {
  const action = useRSSAction()
  const initial = (() => {
    switch (prompt.kind) {
      case 'rename': return nameOf(prompt.path)
      case 'move': return getRSSParent(prompt.path)
      case 'url': return prompt.feed.url
      case 'interval': return prompt.feed.refreshInterval ? String(Math.round(prompt.feed.refreshInterval / 60)) : ''
      default: return ''
    }
  })()
  const [value, setValue] = useState(initial)
  const [folder, setFolder] = useState('')

  const run = (work: () => Promise<unknown>, done: string, failed: string) =>
    action.mutateAsync({ work, done, failed }).then(onClose, () => undefined)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const text = value.trim()
    switch (prompt.kind) {
      case 'addFeed':
        if (!text) return
        return run(() => qbitClient.addRSSFeed(text, folder), 'Feed added', 'Failed to add feed')
      case 'addFolder':
        if (!text || text.includes('\\')) return toast.error('Enter a name without \\')
        return run(() => qbitClient.addRSSFolder(joinRSSPath(folder, text)), 'Folder created', 'Failed to create folder')
      case 'rename':
        if (!text || text.includes('\\')) return toast.error('Enter a name without \\')
        return run(() => qbitClient.moveRSSItem(prompt.path, joinRSSPath(getRSSParent(prompt.path), text)), 'Renamed', 'Failed to rename')
      case 'move':
        return run(() => qbitClient.moveRSSItem(prompt.path, joinRSSPath(value, nameOf(prompt.path))), 'Moved', 'Failed to move')
      case 'url':
        if (!text) return
        return run(() => qbitClient.setRSSFeedURL(prompt.feed.path, text), 'Feed address changed', 'Failed to change the feed address')
      case 'interval': {
        const minutes = text === '' ? 0 : Number(text)
        if (!Number.isInteger(minutes) || minutes < 0) return toast.error('Enter whole minutes, or leave it blank')
        return run(() => qbitClient.setRSSFeedRefreshInterval(prompt.feed.path, minutes * 60), 'Refresh time saved', 'Failed to save the refresh time')
      }
      case 'remove':
        return run(() => qbitClient.removeRSSFeed(prompt.path), prompt.isFolder ? 'Folder removed' : 'Feed removed', 'Failed to remove')
    }
  }

  const titles: Record<Prompt['kind'], string> = {
    addFeed: 'Add feed',
    addFolder: 'New folder',
    rename: 'Rename',
    move: 'Move to folder',
    url: 'Change feed address',
    interval: 'Refresh time',
    remove: prompt.kind === 'remove' && prompt.isFolder ? 'Remove this folder?' : 'Remove this feed?',
  }
  const movableFolders = prompt.kind === 'move' ? folders.filter(f => f !== prompt.path && !f.startsWith(`${prompt.path}\\`)) : folders

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[prompt.kind]}</DialogTitle>
          {prompt.kind === 'remove' && (
            <DialogDescription>
              {prompt.isFolder ? `${nameOf(prompt.path)} and every feed in it will be removed.` : `${nameOf(prompt.path)} will be removed. Torrents it already added stay.`}
            </DialogDescription>
          )}
          {prompt.kind === 'interval' && <DialogDescription>Leave it blank to use the time set in Settings &gt; RSS.</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {prompt.kind === 'move' ? (
            <select aria-label="Folder" value={value} onChange={(e) => setValue(e.target.value)} className={selectClass}>
              <option value="">Top level</option>
              {movableFolders.map(f => <option key={f} value={f}>{f.replaceAll('\\', ' / ')}</option>)}
            </select>
          ) : prompt.kind !== 'remove' && (
            <div className="space-y-1">
              <Label htmlFor="rss-prompt" className="text-xs text-muted-foreground">
                {prompt.kind === 'addFeed' || prompt.kind === 'url' ? 'Feed address' : prompt.kind === 'interval' ? 'Minutes' : 'Name'}
              </Label>
              <Input id="rss-prompt" autoFocus type={prompt.kind === 'interval' ? 'number' : 'text'} min={0} value={value} placeholder={prompt.kind === 'interval' ? 'Default' : undefined} onChange={(e) => setValue(e.target.value)} />
            </div>
          )}
          {(prompt.kind === 'addFeed' || prompt.kind === 'addFolder') && folders.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="rss-prompt-folder" className="text-xs text-muted-foreground">In folder</Label>
              <select id="rss-prompt-folder" value={folder} onChange={(e) => setFolder(e.target.value)} className={selectClass}>
                <option value="">Top level</option>
                {folders.map(f => <option key={f} value={f}>{f.replaceAll('\\', ' / ')}</option>)}
              </select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant={prompt.kind === 'remove' ? 'destructive' : 'default'} disabled={action.isPending}>
              {prompt.kind === 'remove' ? 'Remove' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RSSView() {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null)
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const { data: feedsData, isLoading: feedsLoading } = useRSSFeeds()
  const { data: itemsData, isLoading: itemsLoading } = useRSSItems(selectedFeed || '')
  const action = useRSSAction()
  const queryClient = useQueryClient()

  const feeds = feedsData?.feeds ?? []
  const folders = feedsData?.folders ?? []
  const items = itemsData?.articles ?? []
  const current = feeds.find(feed => feed.uid === selectedFeed)

  const markRead = async (path: string, articleId?: string) => {
    try {
      await qbitClient.markAsRead(path, articleId)
      queryClient.invalidateQueries({ queryKey: ['rss'] })
    } catch {
      // Marking as read is a nicety, so a failure isn't worth interrupting for.
    }
  }

  const download = async (url: string) => {
    try {
      await qbitClient.addTorrentUrl(url)
      toast.success('Torrent added')
      queryClient.invalidateQueries({ queryKey: ['torrents'] })
    } catch (e) {
      toast.error("Couldn't add the torrent", { description: e instanceof Error ? e.message : undefined })
    }
  }

  const refresh = (path: string, done: string) => action.mutate({ work: () => qbitClient.refreshRSSItem(path), done, failed: 'Failed to refresh' })

  const feedMenu = (feed: RSSFeed) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label={`Actions for ${feed.title}`} title="Actions" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => refresh(feed.path, 'Refreshing feed')}>Refresh</DropdownMenuItem>
        <DropdownMenuItem onClick={() => markRead(feed.path)}>Mark all as read</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPrompt({ kind: 'rename', path: feed.path, isFolder: false })}>Rename</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPrompt({ kind: 'move', path: feed.path })}>Move to folder</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPrompt({ kind: 'url', feed })}>Change address</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setPrompt({ kind: 'interval', feed })}>Refresh time</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => setPrompt({ kind: 'remove', path: feed.path, isFolder: false })}>Remove</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const renderFeed = (feed: RSSFeed, depth: number) => (
    <Card
      key={feed.uid}
      className={`cursor-pointer py-0 hover:bg-accent ${selectedFeed === feed.uid ? 'border-primary' : ''}`}
      style={{ marginLeft: depth * 12 }}
      onClick={() => setSelectedFeed(feed.uid)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{feed.title}</p>
            <p className="truncate text-xs text-muted-foreground">{feed.url}</p>
            <div className="mt-1 flex flex-wrap gap-1 text-xs">
              {feed.unreadCount > 0 && <span className="rounded bg-primary px-1.5 py-0.5 text-primary-foreground">{feed.unreadCount}</span>}
              {feed.isLoading && <span className="text-muted-foreground">Refreshing...</span>}
              {feed.hasError && <span className="text-destructive">Couldn't fetch</span>}
            </div>
          </div>
          {feedMenu(feed)}
        </div>
      </CardContent>
    </Card>
  )

  const renderFolder = (folder: string, depth: number): ReactNode => {
    const childFolders = folders.filter(f => getRSSParent(f) === folder)
    const childFeeds = feeds.filter(feed => getRSSParent(feed.path) === folder)
    return (
      <div key={`folder-${folder}`} className="space-y-2">
        {folder && (
          <div className="flex items-center gap-1 text-sm font-medium" style={{ marginLeft: (depth - 1) * 12 }}>
            <Folder className="h-4 w-4 text-yellow-500" />
            <span className="min-w-0 flex-1 truncate">{nameOf(folder)}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Actions for folder ${nameOf(folder)}`} title="Actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => refresh(folder, 'Refreshing folder')}>Refresh</DropdownMenuItem>
                <DropdownMenuItem onClick={() => markRead(folder)}>Mark all as read</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPrompt({ kind: 'rename', path: folder, isFolder: true })}>Rename</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPrompt({ kind: 'move', path: folder })}>Move to folder</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setPrompt({ kind: 'remove', path: folder, isFolder: true })}>Remove</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {childFolders.map(child => renderFolder(child, depth + 1))}
        {childFeeds.map(feed => renderFeed(feed, depth))}
      </div>
    )
  }

  if (feedsLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading feeds...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="w-full space-y-2 md:w-72">
          <div className="flex items-center justify-between gap-1">
            <h2 className="text-lg font-semibold">Feeds</h2>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" aria-label="Refresh all feeds" title="Refresh all feeds" disabled={feeds.length === 0} onClick={() => refresh('', 'Refreshing all feeds')}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" aria-label="New folder" title="New folder" onClick={() => setPrompt({ kind: 'addFolder' })}>
                <FolderPlus className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" aria-label="Add feed" title="Add feed" onClick={() => setPrompt({ kind: 'addFeed' })}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {feeds.length === 0 && folders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No feeds configured</p>
          ) : (
            renderFolder('', 0)
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {current && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="min-w-0 truncate font-medium">{current.title}</h3>
              <Button size="sm" variant="ghost" disabled={current.unreadCount === 0} onClick={() => markRead(current.path)}>Mark all as read</Button>
            </div>
          )}
          {selectedFeed ? (
            itemsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading articles...</div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No articles</div>
            ) : (
              items.map((item) => (
                <Card key={item.id} className="py-0">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Rss className={`mt-1 h-4 w-4 flex-shrink-0 ${item.isRead ? 'text-muted-foreground' : 'text-primary'}`} />
                      <div className="min-w-0 flex-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm hover:underline ${item.isRead ? '' : 'font-semibold'}`}
                          onClick={() => current && !item.isRead && markRead(current.path, item.id)}
                        >
                          {item.title}
                        </a>
                        {item.date && <p className="text-xs text-muted-foreground">{item.date}</p>}
                        {item.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>}
                      </div>
                      {item.torrentUrl && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" aria-label={`Download ${item.title}`} title="Download torrent" onClick={() => download(item.torrentUrl!)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 p-2" aria-label={`Open ${item.title}`} title="Open article">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          ) : (
            <div className="py-8 text-center text-muted-foreground">Select a feed to view articles</div>
          )}
        </div>
      </div>
      <RSSRules />
      {prompt && <PromptDialog prompt={prompt} folders={folders} onClose={() => setPrompt(null)} />}
    </div>
  )
}
