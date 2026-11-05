import { useEffect, useState } from 'react'
import { ChevronUp, File, Folder } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { qbitClient } from '@/lib/api'

interface FolderPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  start: string
  // "dirs" picks a folder, "all" picks a file, "any" picks either.
  mode: 'dirs' | 'all' | 'any'
  onPick: (path: string) => void
}

const parentOf = (path: string) => {
  const trimmed = path.replace(/[/\\]+$/, '')
  const cut = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'))
  if (cut <= 0) return trimmed.startsWith('/') ? '/' : trimmed
  return trimmed.slice(0, cut) || '/'
}

const nameOf = (path: string) => path.replace(/[/\\]+$/, '').split(/[/\\]/).pop() || path

// Browses folders on the machine where qBittorrent runs, not on this device.
export function FolderPicker({ open, onOpenChange, start, mode, onPick }: FolderPickerProps) {
  const [dir, setDir] = useState(start || '/')
  const [entries, setEntries] = useState<{ path: string; isDir: boolean }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [dirs, all] = await Promise.all([
          qbitClient.getDirectoryContent(dir, 'dirs'),
          mode !== 'dirs' ? qbitClient.getDirectoryContent(dir, 'all') : Promise.resolve([] as string[]),
        ])
        if (cancelled) return
        const dirSet = new Set(dirs)
        const files = all.filter(path => !dirSet.has(path))
        setEntries([...dirs.sort().map(path => ({ path, isDir: true })), ...files.sort().map(path => ({ path, isDir: false }))])
      } catch (e) {
        if (cancelled) return
        setEntries([])
        setError(e instanceof Error && e.message.includes('404') ? "This folder doesn't exist." : "Couldn't open this folder.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [dir, mode, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{mode === 'dirs' ? 'Choose a folder' : mode === 'all' ? 'Choose a file' : 'Choose a file or folder'}</DialogTitle>
          <DialogDescription>On the machine where qBittorrent runs.</DialogDescription>
        </DialogHeader>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const value = (e.currentTarget.elements.namedItem('picker-path') as HTMLInputElement).value.trim(); if (value) setDir(value) }}>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8 flex-shrink-0" aria-label="Up one folder" onClick={() => setDir(parentOf(dir))}>
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Input key={dir} name="picker-path" aria-label="Folder path" defaultValue={dir} className="h-8 text-sm" />
          <Button type="submit" size="sm" variant="outline">Go</Button>
        </form>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading...</p>
          ) : error ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{error}</p>
          ) : entries.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing in here</p>
          ) : (
            <ul className="text-sm">
              {entries.map(entry => (
                <li key={entry.path}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted"
                    onClick={() => (entry.isDir ? setDir(entry.path) : (onPick(entry.path), onOpenChange(false)))}
                  >
                    {entry.isDir ? <Folder className="h-4 w-4 flex-shrink-0 text-yellow-500" /> : <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
                    <span className="break-all">{nameOf(entry.path)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {mode !== 'all' && <Button onClick={() => { onPick(dir); onOpenChange(false) }}>Use this folder</Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
