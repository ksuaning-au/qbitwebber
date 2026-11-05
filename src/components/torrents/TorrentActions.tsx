import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpToLine } from 'lucide-react'
import { ConfirmAction } from '@/components/ConfirmAction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCategories, useTorrentAction } from '@/hooks/useApi'
import { qbitClient, type QueueMove } from '@/lib/api'
import { parseTags } from '@/lib/torrentFilters'
import { toast } from '@/hooks/use-toast'
import { ShareLimitsForm } from './ShareLimitsForm'
import { SSLParametersForm } from './SSLParametersForm'
import type { Torrent } from '@/types'

const toKiB = (bytes: number) => (bytes > 0 ? String(Math.round(bytes / 1024)) : '0')

function FieldForm({ id, label, value, onChange, onSave, type = 'text', placeholder, pending }: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  onSave: () => Promise<void>
  type?: string
  placeholder?: string
  pending: boolean
}) {
  const submit = (e: FormEvent) => {
    e.preventDefault()
    void onSave()
  }

  return (
    <form onSubmit={submit} className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input id={id} type={type} min={type === 'number' ? 0 : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>Save</Button>
      </div>
    </form>
  )
}

// Field values start from the torrent and don't follow refreshes, so typing isn't overwritten.
export function TorrentActions({ torrent }: { torrent: Torrent }) {
  const hashes = [torrent.hash]
  const stopped = /^(stopped|paused)/.test(torrent.state)
  const action = useTorrentAction()
  const { data: categories } = useCategories()
  const [name, setName] = useState(torrent.name)
  const [location, setLocation] = useState(torrent.save_path)
  const [tags, setTags] = useState(parseTags(torrent.tags).join(', '))
  const [dlLimit, setDlLimit] = useState(toKiB(torrent.dl_limit))
  const [upLimit, setUpLimit] = useState(toKiB(torrent.up_limit))
  const [comment, setComment] = useState(torrent.comment ?? '')
  const [downloadPath, setDownloadPath] = useState(torrent.download_path ?? '')
  const complete = torrent.progress >= 1
  // qBittorrent reports 0 for torrents outside the queue, including all of them when queueing is off.
  const queued = torrent.priority > 0

  const run = (work: () => Promise<unknown>, done: string, failed: string) =>
    action.mutateAsync({ work, failed }).then(() => { toast.success(done) }, () => undefined)

  const saveLimit = (value: string, set: typeof qbitClient.setDownloadLimit, done: string, failed: string) => {
    const kib = Number(value)
    if (!Number.isFinite(kib) || kib < 0) {
      toast.error('Enter 0 or a higher number')
      return Promise.resolve()
    }
    return run(() => set.call(qbitClient, hashes, Math.round(kib * 1024)), done, failed)
  }

  const saveTags = () => {
    const current = parseTags(torrent.tags)
    const next = parseTags(tags)
    const added = next.filter(tag => !current.includes(tag))
    const removed = current.filter(tag => !next.includes(tag))
    return run(async () => {
      if (added.length) await qbitClient.addTags(hashes, added)
      if (removed.length) await qbitClient.removeTags(hashes, removed)
    }, 'Tags saved', 'Failed to save tags')
  }

  return (
    <div className="space-y-3 px-2 pb-2 pt-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={action.isPending} onClick={() => run(() => qbitClient.recheckTorrents(hashes), 'Recheck started', 'Failed to start recheck')}>
          Recheck
        </Button>
        <Button type="button" size="sm" variant={torrent.force_start ? 'secondary' : 'outline'} aria-pressed={!!torrent.force_start} disabled={action.isPending} onClick={() => run(() => qbitClient.setForceStart(hashes, !torrent.force_start), torrent.force_start ? 'Force start off' : 'Force start on', 'Failed to change force start')}>
          Force start
        </Button>
        {/* A disabled button shows no tooltip, so the wrapper carries it. */}
        <span className={stopped ? 'cursor-not-allowed' : undefined} title={stopped ? 'Start the torrent first: stopped torrents don\'t contact trackers' : 'Ask the trackers for more peers now'}>
          <Button type="button" size="sm" variant="outline" disabled={action.isPending || stopped} onClick={() => run(() => qbitClient.reannounceTorrents(hashes), 'Reannounce sent', 'Failed to reannounce')}>
            Reannounce
          </Button>
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">Download options</div>
        <div className="flex flex-wrap gap-2">
          {!complete && (
            <>
              <Button type="button" size="sm" variant={torrent.seq_dl ? 'secondary' : 'outline'} aria-pressed={!!torrent.seq_dl} disabled={action.isPending} onClick={() => run(() => qbitClient.toggleSequentialDownload(hashes), torrent.seq_dl ? 'Sequential download off' : 'Sequential download on', 'Failed to change sequential download')}>
                Sequential download
              </Button>
              <Button type="button" size="sm" variant={torrent.f_l_piece_prio ? 'secondary' : 'outline'} aria-pressed={!!torrent.f_l_piece_prio} disabled={action.isPending} onClick={() => run(() => qbitClient.toggleFirstLastPiecePrio(hashes), torrent.f_l_piece_prio ? 'First and last pieces first off' : 'First and last pieces first on', 'Failed to change piece order')}>
                First and last pieces first
              </Button>
            </>
          )}
          {complete && (
            <Button type="button" size="sm" variant={torrent.super_seeding ? 'secondary' : 'outline'} aria-pressed={!!torrent.super_seeding} title="Sends each peer different pieces, to spread a new torrent faster" disabled={action.isPending} onClick={() => run(() => qbitClient.setSuperSeeding(hashes, !torrent.super_seeding), torrent.super_seeding ? 'Super seeding off' : 'Super seeding on', 'Failed to change super seeding')}>
              Super seeding
            </Button>
          )}
          {torrent.auto_tmm ? (
            <Button type="button" size="sm" variant="secondary" aria-pressed title="qBittorrent sets this torrent's location from its category" disabled={action.isPending} onClick={() => run(() => qbitClient.setAutoManagement(hashes, false), 'Automatic management off', 'Failed to change automatic management')}>
              Automatic management
            </Button>
          ) : (
            <ConfirmAction
              buttonLabel="Automatic management"
              pressed={false}
              label="qBittorrent sets this torrent's location from its category"
              title="Turn on automatic management?"
              message="qBittorrent will set this torrent's location from its category, and may move its files to the category's save path."
              confirmLabel="Turn on"
              disabled={action.isPending}
              onConfirm={() => run(() => qbitClient.setAutoManagement(hashes, true), 'Automatic management on', 'Failed to change automatic management')}
            />
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs text-muted-foreground">
          Queue position: {queued ? torrent.priority : 'not queued'}
        </div>
        <div className="flex gap-2" title={queued ? undefined : 'Only queued torrents can be moved. Queueing must be on in Settings > Queueing.'}>
          {([
            ['top', 'Move to top', ArrowUpToLine],
            ['up', 'Move up', ArrowUp],
            ['down', 'Move down', ArrowDown],
            ['bottom', 'Move to bottom', ArrowDownToLine],
          ] as [QueueMove, string, typeof ArrowUp][]).map(([direction, label, Icon]) => (
            <Button key={direction} type="button" size="icon" variant="outline" className="h-8 w-8" aria-label={label} title={queued ? label : undefined} disabled={action.isPending || !queued} onClick={() => run(() => qbitClient.moveInQueue(hashes, direction), 'Queue order changed', 'Failed to change queue order')}>
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="torrent-category" className="text-xs text-muted-foreground">Category</Label>
        <select
          id="torrent-category"
          value={torrent.category}
          disabled={action.isPending}
          onChange={(e) => {
            // Read now: the controlled select goes back to the current category until the refresh.
            const category = e.target.value
            run(() => qbitClient.setCategory(hashes, category), 'Category saved', 'Failed to save category')
          }}
          className="border-input dark:bg-input/30 h-8 w-full rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="">No category</option>
          {torrent.category && !categories?.[torrent.category] && <option value={torrent.category}>{torrent.category}</option>}
          {Object.keys(categories ?? {}).map(category => <option key={category} value={category}>{category}</option>)}
        </select>
      </div>

      <FieldForm id="torrent-tags" label="Tags, separated by commas" value={tags} onChange={setTags} onSave={saveTags} pending={action.isPending} />
      <FieldForm id="torrent-name" label="Name" value={name} onChange={setName} pending={action.isPending} onSave={() => run(() => qbitClient.renameTorrent(torrent.hash, name.trim()), 'Renamed', 'Failed to rename')} />
      <FieldForm id="torrent-location" label="Save location (moves the files)" value={location} onChange={setLocation} pending={action.isPending} onSave={() => run(() => qbitClient.setLocation(hashes, location.trim()), 'Move started', 'Failed to move')} />
      <FieldForm id="torrent-download-path" label="Folder for incomplete files (blank = save location)" value={downloadPath} onChange={setDownloadPath} pending={action.isPending} onSave={() => run(() => qbitClient.setDownloadPath(hashes, downloadPath.trim()), 'Incomplete files folder saved', 'Failed to save incomplete files folder')} />
      {torrent.comment !== undefined && (
        <FieldForm id="torrent-comment" label="Comment" value={comment} onChange={setComment} pending={action.isPending} onSave={() => run(() => qbitClient.setComment(hashes, comment.trim()), 'Comment saved', 'Failed to save comment')} />
      )}
      <FieldForm id="torrent-dl-limit" label="Download limit (KiB/s, 0 = unlimited)" type="number" value={dlLimit} onChange={setDlLimit} pending={action.isPending} onSave={() => saveLimit(dlLimit, qbitClient.setDownloadLimit, 'Download limit saved', 'Failed to save download limit')} />
      <FieldForm id="torrent-up-limit" label="Upload limit (KiB/s, 0 = unlimited)" type="number" value={upLimit} onChange={setUpLimit} pending={action.isPending} onSave={() => saveLimit(upLimit, qbitClient.setUploadLimit, 'Upload limit saved', 'Failed to save upload limit')} />
      <ShareLimitsForm torrent={torrent} />
      <SSLParametersForm hash={torrent.hash} />
    </div>
  )
}
