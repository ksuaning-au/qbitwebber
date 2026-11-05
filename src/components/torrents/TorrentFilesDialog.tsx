import { useState, type FormEvent, type ReactNode } from 'react'
import { FolderOpen, File, CheckSquare, Square, Download, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTorrentAction, useTorrentFiles, useSetFilePriority, useWebApiVersion } from '@/hooks/useApi'
import { qbitClient, getTorrentExportUrl } from '@/lib/api'
import { copyText } from '@/lib/clipboard'
import { getNameProblem, getRenamedPath } from '@/lib/filePaths'
import { formatDuration } from '@/lib/format'
import { PeersTab } from './PeersTab'
import { TorrentActions } from './TorrentActions'
import { TrackersTab } from './TrackersTab'
import { PieceBar } from './PieceBar'
import { toast } from '@/hooks/use-toast'
import { getFileDownloadUrl, supportsFileDownload } from '@/lib/fileDownloads'
import { formatSize } from '@/lib/utils'
import type { Torrent, TorrentFile } from '@/types'

interface FileDownloadButtonProps {
  // null when the file is unavailable; `reason` then says why.
  url: string | null
  fileName: string
  reason: string
}

function FileDownloadButton({ url, fileName, reason }: FileDownloadButtonProps) {
  if (!url) {
    // A disabled button ignores the pointer, so the wrapper shows the tooltip and
    // keeps clicks from reaching the file row, which would toggle its selection.
    return (
      <span
        className="inline-flex flex-shrink-0 cursor-not-allowed"
        title={reason}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled
          aria-label={`Download ${fileName}: ${reason}`}
        >
          <Download className="h-3 w-3" />
        </Button>
      </span>
    )
  }

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" asChild>
      <a
        href={url}
        download={fileName.split('/').pop()}
        target="_blank"
        rel="noopener"
        title={`Download ${fileName}`}
        aria-label={`Download ${fileName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Download className="h-3 w-3" />
      </a>
    </Button>
  )
}

// Resolves to true once the rename worked, so the form can close.
type RenameHandler = (oldPath: string, isFile: boolean, newName: string) => Promise<boolean>

function RenameForm({ path, onRename, onDone, indent }: { path: string; onRename: (newName: string) => Promise<boolean>; onDone: () => void; indent: number }) {
  const currentName = path.split('/').pop() ?? path
  const [name, setName] = useState(currentName)
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = getNameProblem(name)
    if (problem) {
      toast.error(problem)
      return
    }
    if (name.trim() === currentName) {
      onDone()
      return
    }
    setSaving(true)
    const renamed = await onRename(name.trim())
    setSaving(false)
    if (renamed) onDone()
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 py-1 px-2" style={{ paddingLeft: indent }} onClick={(e) => e.stopPropagation()}>
      <Input aria-label={`New name for ${currentName}`} value={name} autoFocus onChange={(e) => setName(e.target.value)} className="h-7 text-sm" />
      <Button type="submit" size="sm" variant="outline" className="h-7" disabled={saving}>Save</Button>
      <Button type="button" size="sm" variant="ghost" className="h-7" onClick={onDone}>Cancel</Button>
    </form>
  )
}

interface FileTreeProps {
  files: TorrentFile[]
  renderDownload: (file: TorrentFile) => ReactNode
  onPriorityChange: (id: string, priority: number) => void
  onRename: RenameHandler
}

function FileTree({ files, renderDownload, onPriorityChange, onRename }: FileTreeProps) {
  const [renaming, setRenaming] = useState<string | null>(null)

  // Build a simple tree structure
  interface TreeNode {
    name: string
    path: string
    isFile: boolean
    size: number
    progress: number
    priority: number
    index: number
    file: TorrentFile
    children: TreeNode[]
  }

  const buildTree = (): TreeNode[] => {
    const root: TreeNode[] = []

    files.forEach(file => {
      const parts = file.name.split('/')
      let current = root

      parts.forEach((part, idx) => {
        const isLast = idx === parts.length - 1
        const path = parts.slice(0, idx + 1).join('/')

        let node = current.find(n => n.name === part)

        if (!node) {
          node = {
            name: part,
            path,
            isFile: isLast,
            size: isLast ? file.size : 0,
            progress: isLast ? file.progress : 0,
            priority: isLast ? file.priority : 0,
            index: file.index,
            file,
            children: []
          }
          current.push(node)
        }

        if (!isLast) {
          current = node.children
        }
      })
    })

    return root
  }

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const indent = depth * 16
    const renameButton = (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 flex-shrink-0"
        aria-label={`Rename ${node.name}`}
        title="Rename"
        onClick={(e) => { e.stopPropagation(); setRenaming(node.path) }}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    )
    const renameForm = renaming === node.path && (
      <RenameForm key={`rename-${node.path}`} path={node.path} indent={indent} onDone={() => setRenaming(null)} onRename={(name) => onRename(node.path, node.isFile, name)} />
    )

    if (node.isFile && renameForm) return renameForm

    if (node.isFile) {
      const isSelected = node.priority > 0
      return (
        <div
          key={node.path}
          className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 cursor-pointer"
          style={{ paddingLeft: indent }}
          onClick={() => onPriorityChange(String(node.index), isSelected ? 0 : 1)}
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-green-500 flex-shrink-0" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm truncate flex-1">{node.name}</span>
          <span className="text-xs text-muted-foreground flex-shrink-0">{formatSize(node.size)}</span>
          {node.progress > 0 && node.progress < 1 && (
            <span className="text-xs text-muted-foreground flex-shrink-0">{Math.round(node.progress * 100)}%</span>
          )}
          {renameButton}
          {renderDownload(node.file)}
        </div>
      )
    }

    return (
      <div key={node.path}>
        {renameForm || (
          <div
            className="flex items-center gap-2 py-1 px-2 font-medium text-sm"
            style={{ paddingLeft: indent }}
          >
            <FolderOpen className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            <span className="truncate flex-1">{node.name}</span>
            {renameButton}
          </div>
        )}
        {node.children.map(child => renderNode(child, depth + 1))}
      </div>
    )
  }

  const tree = buildTree()

  return (
    <div className="space-y-1">
      {tree.map(node => renderNode(node))}
    </div>
  )
}

function formatDate(seconds: number | undefined): string {
  return seconds && seconds > 0 ? new Date(seconds * 1000).toLocaleString() : '-'
}

interface TorrentFilesDialogProps {
  torrent: Torrent | null
  initialTab?: 'details' | 'content'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TorrentFilesDialog({ torrent, initialTab = 'content', open, onOpenChange }: TorrentFilesDialogProps) {
  const { data: files, isLoading } = useTorrentFiles(torrent?.hash ?? null)
  const setPriority = useSetFilePriority()
  const action = useTorrentAction()
  const webApiVersion = useWebApiVersion()

  const handlePriorityChange = async (id: string, priority: number) => {
    if (!torrent) return

    try {
      await setPriority.mutateAsync({ hash: torrent.hash, id, priority })
    } catch {
      toast.error('Failed to update file priority')
    }
  }

  if (!torrent) return null

  const handleRename: RenameHandler = (oldPath, isFile, newName) => {
    const newPath = getRenamedPath(oldPath, newName)
    return action.mutateAsync({
      work: () => (isFile ? qbitClient.renameFile(torrent.hash, oldPath, newPath) : qbitClient.renameFolder(torrent.hash, oldPath, newPath)),
      failed: isFile ? 'Failed to rename file' : 'Failed to rename folder',
    }).then(() => { toast.success('Renamed'); return true }, () => false)
  }

  const copy = async (text: string, what: string) => {
    if (await copyText(text)) toast.success(`${what} copied`)
    else toast.error(`Couldn't copy the ${what.toLowerCase()}`)
  }

  const selectedCount = files?.filter(f => f.priority > 0).length || 0
  const totalSize = files?.reduce((acc, f) => acc + f.size, 0) || 0
  const selectedSize = files?.filter(f => f.priority > 0).reduce((acc, f) => acc + f.size, 0) || 0

  const canDownload = !!webApiVersion.data && supportsFileDownload(webApiVersion.data)
  const downloadIssue = webApiVersion.isError
    ? "Couldn't check whether this qBittorrent can serve files. Reload the page to try again."
    : webApiVersion.data && !canDownload
      ? 'Downloading files needs qBittorrent 5.3 or newer.'
      : null

  const renderDownload = (file: TorrentFile) => {
    const isComplete = file.progress >= 1
    const url = isComplete && canDownload ? getFileDownloadUrl(torrent.hash, file.index) : null
    const reason = !isComplete
      ? 'File is not fully downloaded yet'
      : downloadIssue ?? 'Checking whether this qBittorrent can serve files'
    return <FileDownloadButton url={url} fileName={file.name} reason={reason} />
  }

  const completedFiles = files?.filter(f => f.progress >= 1) ?? []
  const details = ([
    ['Size', formatSize(torrent.size)],
    ['Progress', `${Math.round(torrent.progress * 100)}%`],
    ['Download speed', `${formatSize(torrent.dlspeed)}/s`],
    ['Upload speed', `${formatSize(torrent.upspeed)}/s`],
    ['Downloaded', formatSize(torrent.downloaded ?? 0)],
    ['Uploaded', formatSize(torrent.uploaded ?? 0)],
    ['Added', formatDate(torrent.added_on)],
    ['Completed', formatDate(torrent.completion_on)],
    ['Ratio', torrent.ratio.toFixed(2)],
    ['Seeds', String(torrent.num_seeds)],
    ['Peers', String(torrent.num_leechs)],
    ['Queue position', torrent.priority > 0 ? String(torrent.priority) : 'Not queued'],
    ['Time active', formatDuration(torrent.time_active)],
    ['Seeding time', formatDuration(torrent.seeding_time)],
    ['Availability', torrent.availability !== undefined && torrent.availability >= 0 ? torrent.availability.toFixed(3) : undefined],
    ['Next announce', torrent.reannounce !== undefined ? formatDuration(torrent.reannounce) : undefined],
    ['Connections', torrent.connections_count !== undefined ? `${torrent.connections_count}${torrent.connections_limit && torrent.connections_limit > 0 ? ` of ${torrent.connections_limit}` : ''}` : undefined],
    ['Wasted', torrent.total_wasted !== undefined ? formatSize(torrent.total_wasted) : undefined],
    ['Pieces', torrent.pieces_num ? `${torrent.pieces_have ?? 0} of ${torrent.pieces_num}${torrent.piece_size ? `, ${formatSize(torrent.piece_size)} each` : ''}` : undefined],
    ['Save path', torrent.save_path],
    ['Incomplete files', torrent.download_path || undefined],
    ['Category', torrent.category || '-'],
    ['Tags', torrent.tags || '-'],
    ['Private', torrent.private === undefined ? undefined : torrent.private ? 'Yes' : 'No'],
    ['Created by', torrent.created_by || undefined],
    ['Created on', torrent.creation_date && torrent.creation_date > 0 ? formatDate(torrent.creation_date) : undefined],
    ['Comment', torrent.comment || undefined],
    ['Hash', torrent.hash],
    ['Hash (v2)', torrent.infohash_v2 || undefined],
  ] as [string, string | undefined][]).filter((row): row is [string, string] => row[1] !== undefined)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{torrent.name}</DialogTitle>
        </DialogHeader>

        {downloadIssue && (
          <p className="text-xs text-muted-foreground">{downloadIssue}</p>
        )}

        <Tabs defaultValue={initialTab} className="flex-1 min-h-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details" className="px-0.5 text-xs sm:text-sm">Details</TabsTrigger>
            <TabsTrigger value="content" className="px-0.5 text-xs sm:text-sm">Content</TabsTrigger>
            <TabsTrigger value="actions" className="px-0.5 text-xs sm:text-sm">Actions</TabsTrigger>
            <TabsTrigger value="trackers" className="px-0.5 text-xs sm:text-sm">Trackers</TabsTrigger>
            <TabsTrigger value="peers" className="px-0.5 text-xs sm:text-sm">Peers</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="overflow-y-auto">
            <PieceBar hash={torrent.hash} torrentComplete={torrent.progress >= 1} />

            <div className="flex flex-wrap gap-2 px-2 pb-2">
              <Button type="button" size="sm" variant="outline" onClick={() => copy(torrent.name, 'Name')}>Copy name</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => copy(torrent.hash, 'Hash')}>Copy hash</Button>
              {torrent.magnet_uri && (
                <Button type="button" size="sm" variant="outline" onClick={() => copy(torrent.magnet_uri, 'Magnet link')}>Copy magnet link</Button>
              )}
              {torrent.has_metadata === false ? (
                <span className="inline-flex cursor-not-allowed" title="Available once qBittorrent has this torrent's metadata">
                  <Button type="button" size="sm" variant="outline" disabled>Export .torrent</Button>
                </span>
              ) : (
                <Button size="sm" variant="outline" asChild>
                  <a href={getTorrentExportUrl(torrent.hash)} download={`${torrent.name}.torrent`}>Export .torrent</a>
                </Button>
              )}
            </div>

            <dl className="text-sm divide-y">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 px-2 py-1.5">
                  <dt className="text-muted-foreground flex-shrink-0">{label}</dt>
                  <dd className="truncate" title={value}>{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 px-2 text-sm font-medium">Files ready to download</div>
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading files...</div>
            ) : completedFiles.length > 0 ? (
              <div className="mt-1 space-y-1">
                {completedFiles.map(file => (
                  <div key={file.index} className="flex items-center gap-2 py-1 px-2">
                    <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate flex-1" title={file.name}>{file.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatSize(file.size)}</span>
                    {renderDownload(file)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">No completed files yet</div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="overflow-y-auto">
            <TorrentActions key={torrent.hash} torrent={torrent} />
          </TabsContent>

          <TabsContent value="trackers" className="overflow-y-auto">
            <TrackersTab key={torrent.hash} hash={torrent.hash} />
          </TabsContent>

          <TabsContent value="peers" className="overflow-y-auto">
            <PeersTab key={torrent.hash} hash={torrent.hash} />
          </TabsContent>

          <TabsContent value="content" className="flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between text-sm text-muted-foreground px-4 py-2 border-b">
              <span>{files?.length || 0} files</span>
              <span>Selected: {selectedCount} ({formatSize(selectedSize)} / {formatSize(totalSize)})</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading files...</div>
              ) : files && files.length > 0 ? (
                <FileTree
                  files={files}
                  renderDownload={renderDownload}
                  onPriorityChange={handlePriorityChange}
                  onRename={handleRename}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">No files</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
