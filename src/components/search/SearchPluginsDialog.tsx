import { useEffect, useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { ConfirmAction } from '@/components/ConfirmAction'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSearchPluginAction, useSearchPlugins } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'

// qBittorrent installs and updates plugins after its response, and doesn't report the
// outcome, so the list is refreshed for a while to pick up the result.
const WATCH_INTERVAL_MS = 2000
const WATCH_DURATION_MS = 30000

export function SearchPluginsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [watchId, setWatchId] = useState(0)
  const [watching, setWatching] = useState(false)
  const { data: plugins, isLoading, isError } = useSearchPlugins(open && watching ? WATCH_INTERVAL_MS : false)
  const action = useSearchPluginAction()
  const [source, setSource] = useState('')

  useEffect(() => {
    if (watchId === 0) return
    const timer = window.setTimeout(() => setWatching(false), WATCH_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [watchId])

  const watchForChanges = () => {
    setWatching(true)
    setWatchId(id => id + 1)
  }

  const install = (e: FormEvent) => {
    e.preventDefault()
    const target = source.trim()
    if (!target) {
      toast.error('Enter a plugin link')
      return
    }
    action.mutateAsync({
      work: () => qbitClient.installSearchPlugin([target]),
      failed: 'Failed to install plugin',
    }).then(() => {
      setSource('')
      watchForChanges()
      toast.success('Installing plugin', { description: "It'll appear in the list when it's ready. If it doesn't, check the link." })
    }, () => undefined)
  }

  const checkForUpdates = () => {
    action.mutateAsync({
      work: () => qbitClient.updateSearchPlugins(),
      failed: 'Failed to check for plugin updates',
    }).then(() => {
      watchForChanges()
      toast.success('Checking for plugin updates', { description: 'New versions will appear in the list.' })
    }, () => undefined)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Search plugins</DialogTitle>
          <DialogDescription>Only enabled plugins are used when you search.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          {isLoading ? (
            <div className="py-6 text-center text-muted-foreground">Loading plugins...</div>
          ) : isError && !plugins ? (
            <div className="py-6 text-center text-muted-foreground">Couldn't load plugins</div>
          ) : !plugins?.length ? (
            <div className="py-6 text-center text-muted-foreground">No plugins installed</div>
          ) : (
            <ul className="divide-y text-sm">
              {plugins.map(plugin => (
                <li key={plugin.name} className="flex items-center gap-2 py-2">
                  <Checkbox
                    aria-label={`Enable ${plugin.fullName || plugin.name}`}
                    checked={plugin.enabled}
                    disabled={action.isPending}
                    onCheckedChange={(checked) => action.mutate({
                      work: () => qbitClient.enableSearchPlugin([plugin.name], !!checked),
                      failed: 'Failed to change plugin',
                    })}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{plugin.fullName || plugin.name}</p>
                    <p className="text-xs text-muted-foreground">Version {plugin.version}</p>
                  </div>
                  <ConfirmAction
                    label={`Uninstall ${plugin.fullName || plugin.name}`}
                    title={`Uninstall ${plugin.fullName || plugin.name}?`}
                    message="Searches will stop using this plugin. You can install it again from its link."
                    confirmLabel="Uninstall"
                    disabled={action.isPending}
                    onConfirm={() => action.mutateAsync({
                      work: () => qbitClient.uninstallSearchPlugin([plugin.name]),
                      failed: 'Failed to uninstall plugin',
                    }).then(() => { toast.success('Plugin uninstalled') }, () => undefined)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </ConfirmAction>
                </li>
              ))}
            </ul>
          )}

          <Button type="button" variant="outline" size="sm" disabled={action.isPending} onClick={checkForUpdates}>Check for updates</Button>

          <form onSubmit={install} className="space-y-1 border-t pt-3">
            <Label htmlFor="plugin-source" className="text-xs text-muted-foreground">Install from a link to a plugin's .py file</Label>
            <div className="flex gap-2">
              <Input id="plugin-source" value={source} placeholder="https://example.com/plugin.py" onChange={(e) => setSource(e.target.value)} className="h-8 text-sm" />
              <Button type="submit" size="sm" variant="outline" disabled={action.isPending}>Install</Button>
            </div>
            <p className="text-xs text-muted-foreground">Plugins run as code where qBittorrent is installed, so only install ones you trust.</p>
          </form>
        </div>

        <div className="flex justify-end border-t pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
