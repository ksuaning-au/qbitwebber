import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { ConfirmAction } from '@/components/ConfirmAction'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTorrentAction, useWebSeeds } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'

function WebSeedRow({ hash, url }: { hash: string; url: string }) {
  const action = useTorrentAction()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(url)

  const save = (e: FormEvent) => {
    e.preventDefault()
    const newUrl = value.trim()
    if (!newUrl) {
      toast.error('Enter a web seed URL')
      return
    }
    if (newUrl === url) {
      setEditing(false)
      return
    }
    action.mutateAsync({ work: () => qbitClient.editWebSeed(hash, url, newUrl), failed: 'Failed to change web seed' })
      .then(() => { setEditing(false); toast.success('Web seed changed') }, () => undefined)
  }

  if (editing) {
    return (
      <li className="px-2 py-2">
        <form onSubmit={save} className="space-y-2">
          <Input aria-label="Web seed URL" value={value} autoFocus onChange={(e) => setValue(e.target.value)} className="h-8 text-sm" />
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
      <p className="min-w-0 flex-1 break-all">{url}</p>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" aria-label={`Edit ${url}`} title="Edit web seed" onClick={() => { setValue(url); setEditing(true) }}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <ConfirmAction
        label={`Remove ${url}`}
        title="Remove this web seed?"
        message={`${url} will no longer be used to download this torrent.`}
        confirmLabel="Remove"
        disabled={action.isPending}
        onConfirm={() => action.mutateAsync({ work: () => qbitClient.removeWebSeeds(hash, [url]), failed: 'Failed to remove web seed' })
          .then(() => { toast.success('Web seed removed') }, () => undefined)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </ConfirmAction>
    </li>
  )
}

// Web seeds are HTTP servers that hold the same files as the torrent.
export function WebSeedsSection({ hash }: { hash: string }) {
  const { data: seeds, isLoading, isError } = useWebSeeds(hash)
  const action = useTorrentAction()
  const [newUrls, setNewUrls] = useState('')

  const add = (e: FormEvent) => {
    e.preventDefault()
    const urls = newUrls.split('\n').map(url => url.trim()).filter(Boolean)
    if (urls.length === 0) {
      toast.error('Enter at least one web seed URL')
      return
    }
    action.mutateAsync({ work: () => qbitClient.addWebSeeds(hash, urls), failed: 'Failed to add web seeds' })
      .then(() => { setNewUrls(''); toast.success(urls.length === 1 ? 'Web seed added' : 'Web seeds added') }, () => undefined)
  }

  return (
    <div className="space-y-1 border-t pt-3">
      <h3 className="px-2 text-sm font-medium">Web seeds</h3>
      {isLoading ? (
        <p className="px-2 text-xs text-muted-foreground">Loading web seeds...</p>
      ) : isError && !seeds ? (
        <p className="px-2 text-xs text-muted-foreground">Couldn't load web seeds</p>
      ) : !seeds?.length ? (
        <p className="px-2 text-xs text-muted-foreground">No web seeds</p>
      ) : (
        <ul className="divide-y text-sm">
          {seeds.map(seed => <WebSeedRow key={seed.url} hash={hash} url={seed.url} />)}
        </ul>
      )}
      <form onSubmit={add} className="space-y-1 px-2 pb-2 pt-2">
        <Label htmlFor="new-web-seeds" className="text-xs text-muted-foreground">Add web seeds, one URL per line</Label>
        <textarea
          id="new-web-seeds"
          rows={2}
          value={newUrls}
          onChange={(e) => setNewUrls(e.target.value)}
          placeholder="https://files.example.com/path/"
          className="border-input dark:bg-input/30 w-full rounded-md border bg-transparent px-2 py-1 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={action.isPending}>Add web seeds</Button>
      </form>
    </div>
  )
}
