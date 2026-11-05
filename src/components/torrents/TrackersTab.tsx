import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { ConfirmAction } from '@/components/ConfirmAction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTorrentAction, useTorrentTrackers } from '@/hooks/useApi'
import { WebSeedsSection } from './WebSeedsSection'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'
import type { TorrentTracker } from '@/types'

function TrackerRow({ hash, tracker }: { hash: string; tracker: TorrentTracker }) {
  const action = useTorrentAction()
  const [editing, setEditing] = useState(false)
  const [url, setUrl] = useState(tracker.url)

  const startEditing = () => {
    setUrl(tracker.url)
    setEditing(true)
  }

  const save = (e: FormEvent) => {
    e.preventDefault()
    const newUrl = url.trim()
    if (!newUrl) {
      toast.error('Enter a tracker URL')
      return
    }
    if (newUrl === tracker.url) {
      setEditing(false)
      return
    }
    action.mutateAsync({
      work: () => qbitClient.editTracker(hash, tracker.url, newUrl),
      failed: 'Failed to change tracker',
    }).then(() => {
      setEditing(false)
      toast.success('Tracker changed')
    }, () => undefined)
  }

  const remove = () => {
    action.mutateAsync({
      work: () => qbitClient.removeTrackers(hash, [tracker.url]),
      failed: 'Failed to remove tracker',
    }).then(() => { toast.success('Tracker removed') }, () => undefined)
  }

  if (editing) {
    return (
      <li className="px-2 py-2">
        <form onSubmit={save} className="space-y-2">
          <Label htmlFor={`tracker-${tracker.url}`} className="text-xs text-muted-foreground">Tracker URL</Label>
          <Input id={`tracker-${tracker.url}`} value={url} autoFocus onChange={(e) => setUrl(e.target.value)} className="h-8 text-sm" />
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="outline" disabled={action.isPending}>Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-start gap-1 px-2 py-2">
      <div className="min-w-0 flex-1">
        <p className="break-all">{tracker.url}</p>
        <p className="text-xs text-muted-foreground">
          Seeds {Math.max(tracker.num_seeds ?? 0, 0)} · Peers {Math.max(tracker.num_leeches ?? tracker.num_leechers ?? 0, 0)}{tracker.msg ? ` · ${tracker.msg}` : ''}
        </p>
      </div>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" aria-label={`Edit ${tracker.url}`} title="Edit tracker" onClick={startEditing}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <ConfirmAction
        label={`Remove ${tracker.url}`}
        title="Remove this tracker?"
        message={`${tracker.url} will be removed from this torrent. If it's a private tracker, you may need this URL to add it back.`}
        confirmLabel="Remove"
        disabled={action.isPending}
        onConfirm={remove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </ConfirmAction>
    </li>
  )
}

export function TrackersTab({ hash }: { hash: string }) {
  const { data: trackers, isLoading, isError } = useTorrentTrackers(hash)
  const action = useTorrentAction()
  const [newUrls, setNewUrls] = useState('')

  const add = (e: FormEvent) => {
    e.preventDefault()
    const urls = newUrls.trim()
    if (!urls) {
      toast.error('Enter at least one tracker URL')
      return
    }
    action.mutateAsync({
      work: () => qbitClient.addTrackers(hash, urls),
      failed: 'Failed to add trackers',
    }).then(() => {
      setNewUrls('')
      toast.success('Trackers added')
    }, () => undefined)
  }

  // qBittorrent lists DHT, PeX, and LSD here as pseudo-trackers, with ** around their names.
  const real = (trackers ?? []).filter(tracker => !tracker.url.startsWith('**'))

  return (
    <div className="space-y-3">
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading trackers...</div>
      ) : isError && !trackers ? (
        <div className="py-8 text-center text-muted-foreground">Couldn't load trackers</div>
      ) : real.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No trackers</div>
      ) : (
        <ul className="divide-y text-sm">
          {real.map(tracker => <TrackerRow key={tracker.url} hash={hash} tracker={tracker} />)}
        </ul>
      )}

      <form onSubmit={add} className="space-y-1 border-t px-2 pb-2 pt-3">
        <Label htmlFor="new-trackers" className="text-xs text-muted-foreground">Add trackers, one URL per line</Label>
        <textarea
          id="new-trackers"
          rows={2}
          value={newUrls}
          onChange={(e) => setNewUrls(e.target.value)}
          placeholder="udp://tracker.example.com:6969/announce"
          className="border-input dark:bg-input/30 w-full rounded-md border bg-transparent px-2 py-1 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={action.isPending}>Add trackers</Button>
      </form>

      <WebSeedsSection hash={hash} />
    </div>
  )
}
