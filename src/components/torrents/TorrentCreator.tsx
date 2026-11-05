import { useState, type FormEvent, type ReactNode } from 'react'
import { Download, FolderOpen, Loader2, Trash2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderPicker } from '@/components/settings/FolderPicker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { getCreatedTorrentUrl, qbitClient } from '@/lib/api'
import { DEFAULT_CREATOR_FORM, PIECE_SIZES, buildCreatorParams, isLibtorrentV2, type CreatorForm } from '@/lib/torrentCreator'
import { formatSize } from '@/lib/utils'

const selectClass = 'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-2 text-sm'
const textareaClass = 'border-input dark:bg-input/30 w-full rounded-md border bg-transparent px-3 py-2 text-sm'

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

const nameOf = (path: string) => path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || path

// Makes a new .torrent from files on the machine where qBittorrent runs (qBittorrent 5.0 and newer).
export function TorrentCreator() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreatorForm>(DEFAULT_CREATOR_FORM)
  const [picking, setPicking] = useState<'source' | 'output' | null>(null)
  const [creating, setCreating] = useState(false)
  const { data: build } = useQuery({ queryKey: ['app', 'buildInfo'], queryFn: () => qbitClient.getBuildInfo() })
  const { data: tasks, isError } = useQuery({
    queryKey: ['torrentCreator', 'tasks'],
    queryFn: () => qbitClient.getTorrentCreatorTasks(),
    refetchInterval: (query) => (query.state.data?.some(task => task.status === 'Queued' || task.status === 'Running') ? 1000 : 10000),
  })
  const libtorrentV2 = isLibtorrentV2(build?.libtorrent)
  const set = <K extends keyof CreatorForm>(key: K, value: CreatorForm[K]) => setForm(prev => ({ ...prev, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const params = buildCreatorParams(form, libtorrentV2)
    if (typeof params === 'string') {
      toast.error(params)
      return
    }
    setCreating(true)
    try {
      await qbitClient.createTorrent(params)
      toast.success('Creating the torrent', { description: 'Its progress shows below.' })
      queryClient.invalidateQueries({ queryKey: ['torrentCreator'] })
      if (form.startSeeding) queryClient.invalidateQueries({ queryKey: ['torrents'] })
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      toast.error("Couldn't start creating the torrent", {
        description: message.includes('404') ? 'This needs qBittorrent 5.0 or newer.' : message || undefined,
      })
    } finally {
      setCreating(false)
    }
  }

  const remove = async (taskID: string) => {
    try {
      await qbitClient.deleteTorrentCreatorTask(taskID)
      queryClient.invalidateQueries({ queryKey: ['torrentCreator'] })
    } catch (err) {
      toast.error("Couldn't remove it", { description: err instanceof Error ? err.message : undefined })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Torrent</CardTitle>
        <CardDescription>From files on the machine where qBittorrent runs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={submit} className="space-y-3">
          <Field label="File or folder to share" htmlFor="creator-source">
            <div className="flex gap-2">
              <Input id="creator-source" value={form.sourcePath} onChange={(e) => set('sourcePath', e.target.value)} className="h-9" />
              <Button type="button" size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" aria-label="Browse for the file or folder" title="Browse" onClick={() => setPicking('source')}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {libtorrentV2 && (
              <Field label="Torrent format" htmlFor="creator-format">
                <select id="creator-format" value={form.format} onChange={(e) => set('format', e.target.value as CreatorForm['format'])} className={selectClass}>
                  <option value="hybrid">Hybrid (v1 and v2)</option>
                  <option value="v2">v2</option>
                  <option value="v1">v1</option>
                </select>
              </Field>
            )}
            <Field label="Piece size" htmlFor="creator-piece-size">
              <select id="creator-piece-size" value={form.pieceSize} onChange={(e) => set('pieceSize', Number(e.target.value))} className={selectClass}>
                {PIECE_SIZES.map(size => <option key={size} value={size}>{size === 0 ? 'Automatic' : formatSize(size)}</option>)}
              </select>
            </Field>
          </div>

          <div className="space-y-2">
            {([
              ['creator-private', 'Private torrent (turns off DHT and peer exchange for it)', 'isPrivate'],
              ['creator-seed', 'Start seeding it right away', 'startSeeding'],
              ...(!libtorrentV2 ? [['creator-align', 'Optimize file alignment', 'optimizeAlignment']] : []),
            ] as [string, string, 'isPrivate' | 'startSeeding' | 'optimizeAlignment'][]).map(([id, label, key]) => (
              <div key={id} className="flex items-center gap-2">
                <Checkbox id={id} checked={form[key]} onCheckedChange={(checked) => set(key, !!checked)} />
                <Label htmlFor={id} className="text-sm font-normal">{label}</Label>
              </div>
            ))}
          </div>

          <Field label="Trackers, one per line (a blank line starts a new tier)" htmlFor="creator-trackers">
            <textarea id="creator-trackers" rows={3} value={form.trackers} onChange={(e) => set('trackers', e.target.value)} className={textareaClass} />
          </Field>
          <Field label="Web seeds, one per line" htmlFor="creator-seeds">
            <textarea id="creator-seeds" rows={2} value={form.urlSeeds} onChange={(e) => set('urlSeeds', e.target.value)} className={textareaClass} />
          </Field>
          <Field label="Comment" htmlFor="creator-comment">
            <Input id="creator-comment" value={form.comment} onChange={(e) => set('comment', e.target.value)} className="h-9" />
          </Field>
          <Field label="Source (some private trackers ask for this)" htmlFor="creator-source-tag">
            <Input id="creator-source-tag" value={form.source} onChange={(e) => set('source', e.target.value)} className="h-9" />
          </Field>
          <Field label="Also save the .torrent on qBittorrent's machine at (optional)" htmlFor="creator-output">
            <div className="flex gap-2">
              <Input id="creator-output" placeholder="/path/to/name.torrent" value={form.torrentFilePath} onChange={(e) => set('torrentFilePath', e.target.value)} className="h-9" />
              <Button type="button" size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" aria-label="Browse for where to save the .torrent" title="Browse" onClick={() => setPicking('output')}>
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
          </Field>

          <Button type="submit" className="w-full" disabled={creating}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create torrent
          </Button>
        </form>

        {isError ? (
          <p className="text-xs text-muted-foreground">Torrent creation needs qBittorrent 5.0 or newer.</p>
        ) : !!tasks?.length && (
          <section className="space-y-2 border-t pt-3">
            <h3 className="text-sm font-medium">Created torrents</h3>
            <ul className="space-y-2">
              {tasks.map(task => (
                <li key={task.taskID} className="flex items-center gap-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate" title={task.sourcePath}>{nameOf(task.sourcePath)}</p>
                    <p className={`text-xs ${task.status === 'Failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {task.status === 'Running' ? `Creating, ${Math.round(task.progress ?? 0)}%` : task.status === 'Failed' ? `Failed${task.errorMessage ? `: ${task.errorMessage}` : ''}` : task.status === 'Queued' ? 'Waiting' : 'Done'}
                    </p>
                  </div>
                  {task.status === 'Finished' && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                      <a href={getCreatedTorrentUrl(task.taskID)} download={`${nameOf(task.sourcePath)}.torrent`} aria-label={`Download the .torrent for ${nameOf(task.sourcePath)}`} title="Download .torrent">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Remove ${nameOf(task.sourcePath)} from this list`} title="Remove from list" onClick={() => remove(task.taskID)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {picking && (
          <FolderPicker
            open
            onOpenChange={(open) => !open && setPicking(null)}
            mode={picking === 'source' ? 'any' : 'dirs'}
            start={(picking === 'source' ? form.sourcePath : form.torrentFilePath) || '/'}
            onPick={(path) => (picking === 'source' ? set('sourcePath', path) : set('torrentFilePath', `${path.replace(/[/\\]+$/, '')}/${nameOf(form.sourcePath) || 'new'}.torrent`))}
          />
        )}
      </CardContent>
    </Card>
  )
}
