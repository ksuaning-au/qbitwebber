import { useState, type FormEvent } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCategories, useTorrentAction } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { parseShareLimits, type ShareLimitMode } from '@/lib/shareLimits'
import { parseTags } from '@/lib/torrentFilters'
import type { Torrent } from '@/types'

const selectClass = 'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-2 text-sm'

type Prompt = 'category' | 'addTags' | 'removeTags' | 'location' | 'limits' | 'shareLimits' | 'autoOn'

// The same actions as a single torrent's Actions tab, for every selected torrent at once.
export function BulkActions({ torrents }: { torrents: Torrent[] }) {
  const action = useTorrentAction()
  const { data: categories } = useCategories()
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [value, setValue] = useState('')
  const [second, setSecond] = useState('')
  const [share, setShare] = useState({ mode: 'global' as ShareLimitMode, ratio: '', seedingMinutes: '', inactiveMinutes: '', action: 'Default' })
  const hashes = torrents.map(t => t.hash)
  const count = torrents.length
  const noun = count === 1 ? 'torrent' : 'torrents'

  const run = (work: () => Promise<unknown>, done: string, failed: string) =>
    action.mutateAsync({ work, failed }).then(() => { toast.success(done); setPrompt(null) }, () => undefined)

  const open = (next: Prompt, initial = '', initialSecond = '') => {
    setValue(initial)
    setSecond(initialSecond)
    setPrompt(next)
  }

  const copy = async (text: string, what: string) => {
    if (await copyText(text)) toast.success(`${what} copied`)
    else toast.error(`Couldn't copy the ${what.toLowerCase()}`)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    switch (prompt) {
      case 'category':
        return run(() => qbitClient.setCategory(hashes, value), 'Category set', 'Failed to set category')
      case 'addTags':
      case 'removeTags': {
        const tags = parseTags(value)
        if (!tags.length) return toast.error('Enter at least one tag')
        return prompt === 'addTags'
          ? run(() => qbitClient.addTags(hashes, tags), 'Tags added', 'Failed to add tags')
          : run(() => qbitClient.removeTags(hashes, tags), 'Tags removed', 'Failed to remove tags')
      }
      case 'location':
        if (!value.trim()) return toast.error('Enter a folder')
        return run(() => qbitClient.setLocation(hashes, value.trim()), 'Move started', 'Failed to move')
      case 'limits': {
        const dl = value.trim() === '' ? 0 : Number(value)
        const up = second.trim() === '' ? 0 : Number(second)
        if (!(dl >= 0) || !(up >= 0)) return toast.error('Enter 0 or a higher number')
        return run(async () => {
          await qbitClient.setDownloadLimit(hashes, Math.round(dl * 1024))
          await qbitClient.setUploadLimit(hashes, Math.round(up * 1024))
        }, 'Speed limits saved', 'Failed to save speed limits')
      }
      case 'shareLimits': {
        const limits = parseShareLimits(share)
        if (!limits) return toast.error('Check the seeding limits', { description: 'Use 0 or higher, with whole minutes. Leave a box blank for no limit.' })
        return run(() => qbitClient.setShareLimits(hashes, limits), 'Seeding limits saved', 'Failed to save seeding limits')
      }
      case 'autoOn':
        return run(() => qbitClient.setAutoManagement(hashes, true), 'Automatic management on', 'Failed to change automatic management')
    }
  }

  const titles: Record<Prompt, string> = {
    category: 'Set category',
    addTags: 'Add tags',
    removeTags: 'Remove tags',
    location: 'Move files',
    limits: 'Speed limits',
    shareLimits: 'Seeding limits',
    autoOn: 'Turn on automatic management?',
  }

  const item = (label: string, work: () => Promise<unknown>, done: string, failed: string) => (
    <DropdownMenuItem onClick={() => run(work, done, failed)}>{label}</DropdownMenuItem>
  )

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={action.isPending}>
            <MoreHorizontal className="mr-1 h-4 w-4" /> More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto">
          <DropdownMenuLabel>{count} {noun}</DropdownMenuLabel>
          {item('Recheck', () => qbitClient.recheckTorrents(hashes), 'Recheck started', 'Failed to start recheck')}
          {item('Reannounce', () => qbitClient.reannounceTorrents(hashes), 'Reannounce sent', 'Failed to reannounce')}
          {item('Force start', () => qbitClient.setForceStart(hashes, true), 'Force start on', 'Failed to change force start')}
          {item('Stop forcing', () => qbitClient.setForceStart(hashes, false), 'Force start off', 'Failed to change force start')}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => open('category', torrents.every(t => t.category === torrents[0].category) ? torrents[0].category : '')}>Set category...</DropdownMenuItem>
          <DropdownMenuItem onClick={() => open('addTags')}>Add tags...</DropdownMenuItem>
          <DropdownMenuItem onClick={() => open('removeTags')}>Remove tags...</DropdownMenuItem>
          <DropdownMenuItem onClick={() => open('location', torrents[0]?.save_path ?? '')}>Move files...</DropdownMenuItem>
          <DropdownMenuItem onClick={() => open('limits')}>Speed limits...</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPrompt('shareLimits')}>Seeding limits...</DropdownMenuItem>
          <DropdownMenuSeparator />
          {item('Move to top of queue', () => qbitClient.moveInQueue(hashes, 'top'), 'Queue order changed', 'Failed to change queue order')}
          {item('Move up in queue', () => qbitClient.moveInQueue(hashes, 'up'), 'Queue order changed', 'Failed to change queue order')}
          {item('Move down in queue', () => qbitClient.moveInQueue(hashes, 'down'), 'Queue order changed', 'Failed to change queue order')}
          {item('Move to bottom of queue', () => qbitClient.moveInQueue(hashes, 'bottom'), 'Queue order changed', 'Failed to change queue order')}
          <DropdownMenuSeparator />
          {item('Switch sequential download', () => qbitClient.toggleSequentialDownload(hashes), 'Sequential download switched', 'Failed to change sequential download')}
          {item('Switch first and last pieces first', () => qbitClient.toggleFirstLastPiecePrio(hashes), 'Piece order switched', 'Failed to change piece order')}
          {item('Super seeding on', () => qbitClient.setSuperSeeding(hashes, true), 'Super seeding on', 'Failed to change super seeding')}
          {item('Super seeding off', () => qbitClient.setSuperSeeding(hashes, false), 'Super seeding off', 'Failed to change super seeding')}
          <DropdownMenuItem onClick={() => setPrompt('autoOn')}>Automatic management on...</DropdownMenuItem>
          {item('Automatic management off', () => qbitClient.setAutoManagement(hashes, false), 'Automatic management off', 'Failed to change automatic management')}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => copy(torrents.map(t => t.name).join('\n'), count === 1 ? 'Name' : 'Names')}>Copy names</DropdownMenuItem>
          <DropdownMenuItem onClick={() => copy(hashes.join('\n'), count === 1 ? 'Hash' : 'Hashes')}>Copy hashes</DropdownMenuItem>
          <DropdownMenuItem onClick={() => copy(torrents.map(t => t.magnet_uri).filter(Boolean).join('\n'), count === 1 ? 'Magnet link' : 'Magnet links')}>Copy magnet links</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!prompt} onOpenChange={(isOpen) => !isOpen && setPrompt(null)}>
        <DialogContent>
          {prompt && (
            <>
              <DialogHeader>
                <DialogTitle>{titles[prompt]}</DialogTitle>
                <DialogDescription>
                  {prompt === 'autoOn'
                    ? `qBittorrent will set the location of ${count} ${noun} from their categories, and may move their files.`
                    : prompt === 'location'
                      ? `Moves the files of ${count} ${noun} to this folder on qBittorrent's machine.`
                      : `Applies to ${count} ${noun}.`}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                {prompt === 'category' && (
                  <select aria-label="Category" value={value} onChange={(e) => setValue(e.target.value)} className={selectClass}>
                    <option value="">No category</option>
                    {Object.keys(categories ?? {}).sort().map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                )}
                {(prompt === 'addTags' || prompt === 'removeTags') && (
                  <Input aria-label="Tags, separated by commas" placeholder="Tags, separated by commas" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />
                )}
                {prompt === 'location' && <Input aria-label="Folder" autoFocus value={value} onChange={(e) => setValue(e.target.value)} />}
                {prompt === 'limits' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="bulk-dl" className="text-xs text-muted-foreground">Download (KiB/s, 0 = none)</Label>
                      <Input id="bulk-dl" type="number" min={0} placeholder="0" value={value} onChange={(e) => setValue(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bulk-up" className="text-xs text-muted-foreground">Upload (KiB/s, 0 = none)</Label>
                      <Input id="bulk-up" type="number" min={0} placeholder="0" value={second} onChange={(e) => setSecond(e.target.value)} />
                    </div>
                  </div>
                )}
                {prompt === 'shareLimits' && (
                  <div className="space-y-2">
                    <select aria-label="Seeding limits" value={share.mode} onChange={(e) => setShare({ ...share, mode: e.target.value as ShareLimitMode })} className={selectClass}>
                      <option value="global">Use qBittorrent's global limits</option>
                      <option value="none">No limit</option>
                      <option value="custom">Custom limits</option>
                    </select>
                    {share.mode === 'custom' && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <Input aria-label="Ratio" type="number" min={0} step="any" placeholder="Ratio" value={share.ratio} onChange={(e) => setShare({ ...share, ratio: e.target.value })} />
                        <Input aria-label="Seeding time (minutes)" type="number" min={0} step={1} placeholder="Seeding minutes" value={share.seedingMinutes} onChange={(e) => setShare({ ...share, seedingMinutes: e.target.value })} />
                        <Input aria-label="Inactive time (minutes)" type="number" min={0} step={1} placeholder="Inactive minutes" value={share.inactiveMinutes} onChange={(e) => setShare({ ...share, inactiveMinutes: e.target.value })} />
                      </div>
                    )}
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPrompt(null)}>Cancel</Button>
                  <Button type="submit" disabled={action.isPending}>{prompt === 'autoOn' ? 'Turn on' : 'Apply'}</Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
