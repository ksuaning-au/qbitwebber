import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTorrentAction } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'
import { getShareLimitForm, parseShareLimits, type ShareLimitMode } from '@/lib/shareLimits'
import type { Torrent } from '@/types'

const selectClass = 'border-input dark:bg-input/30 h-8 w-full rounded-md border bg-transparent px-2 text-sm'

const REMOVAL_WARNINGS: Record<string, string> = {
  Remove: 'qBittorrent will remove this torrent without asking once a limit is reached, or right away if it\'s already past one. Its files are kept.',
  RemoveWithContent: 'qBittorrent will remove this torrent and permanently delete its files without asking once a limit is reached, or right away if it\'s already past one.',
}

// Values start from the torrent and don't follow refreshes, so typing isn't overwritten.
export function ShareLimitsForm({ torrent }: { torrent: Torrent }) {
  const action = useTorrentAction()
  const [form, setForm] = useState(() => getShareLimitForm(torrent))
  // Older qBittorrent versions don't report this setting, so it can't be shown or kept.
  const supportsAction = torrent.share_limit_action !== undefined
  const warning = form.mode === 'custom' ? REMOVAL_WARNINGS[form.action] : undefined

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const limits = parseShareLimits(form)
    if (!limits) {
      toast.error('Check the seeding limits', { description: 'Use 0 or higher, with whole minutes. Leave a box blank for no limit.' })
      return
    }
    action.mutateAsync({
      work: () => qbitClient.setShareLimits([torrent.hash], limits),
      failed: 'Failed to save seeding limits',
    }).then(() => { toast.success('Seeding limits saved') }, () => undefined)
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="space-y-1">
        <Label htmlFor="torrent-share-mode" className="text-xs text-muted-foreground">Seeding limits</Label>
        <select
          id="torrent-share-mode"
          value={form.mode}
          onChange={(e) => setForm({ ...form, mode: e.target.value as ShareLimitMode })}
          className={selectClass}
        >
          <option value="global">Use qBittorrent's global limits</option>
          <option value="none">No limit</option>
          <option value="custom">Custom limits</option>
        </select>
      </div>

      {form.mode === 'custom' && (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="torrent-share-ratio" className="text-xs text-muted-foreground">Ratio</Label>
              <Input id="torrent-share-ratio" type="number" min={0} step="any" placeholder="No limit" value={form.ratio} onChange={(e) => setForm({ ...form, ratio: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="torrent-share-seeding" className="text-xs text-muted-foreground">Seeding time (minutes)</Label>
              <Input id="torrent-share-seeding" type="number" min={0} step={1} placeholder="No limit" value={form.seedingMinutes} onChange={(e) => setForm({ ...form, seedingMinutes: e.target.value })} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="torrent-share-inactive" className="text-xs text-muted-foreground">Inactive time (minutes)</Label>
              <Input id="torrent-share-inactive" type="number" min={0} step={1} placeholder="No limit" value={form.inactiveMinutes} onChange={(e) => setForm({ ...form, inactiveMinutes: e.target.value })} className="h-8 text-sm" />
            </div>
          </div>

          {supportsAction && (
            <div className="space-y-1">
              <Label htmlFor="torrent-share-action" className="text-xs text-muted-foreground">When a limit is reached</Label>
              <select
                id="torrent-share-action"
                value={form.action}
                onChange={(e) => setForm({ ...form, action: e.target.value })}
                className={selectClass}
              >
                <option value="Default">Use qBittorrent's global setting</option>
                <option value="Stop">Stop the torrent</option>
                <option value="EnableSuperSeeding">Switch to super seeding</option>
                <option value="Remove">Remove the torrent, keep its files</option>
                <option value="RemoveWithContent">Remove the torrent and delete its files</option>
              </select>
            </div>
          )}

          {warning && <p role="alert" className="text-xs text-destructive">{warning}</p>}
        </>
      )}

      <Button type="submit" size="sm" variant="outline" disabled={action.isPending}>Save seeding limits</Button>
    </form>
  )
}
