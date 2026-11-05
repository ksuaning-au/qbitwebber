import { useState, type ReactNode } from 'react'
import { FolderOpen, File, CheckSquare, Square, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTorrentFiles, useSetFilePriority, useWebApiVersion } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import { getFileDownloadUrl, supportsFileDownload } from '@/lib/fileDownloads'
import type { Torrent, TorrentFile } from '@/types'

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

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

interface FileTreeProps {
  files: TorrentFile[]
  renderDownload: (file: TorrentFile) => ReactNode
  onPriorityChange: (id: string, priority: number) => void
}

function FileTree({ files, renderDownload, onPriorityChange }: FileTreeProps) {
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
          {renderDownload(node.file)}
        </div>
      )
    }

    return (
      <div key={node.path}>
        <div
          className="flex items-center gap-2 py-1 px-2 font-medium text-sm"
          style={{ paddingLeft: indent }}
        >
          <FolderOpen className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          <span className="truncate">{node.name}</span>
        </div>
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

interface TorrentFilesDialogProps {
  torrent: Torrent | null
  initialTab?: 'details' | 'content'
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TorrentFilesDialog({ torrent, initialTab = 'content', open, onOpenChange }: TorrentFilesDialogProps) {
  const { data: files, isLoading } = useTorrentFiles(torrent?.hash ?? null)
  const setPriority = useSetFilePriority()
  const [selectedHash, setSelectedHash] = useState<string | null>(null)
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
  const details: [string, string][] = [
    ['Size', formatSize(torrent.size)],
    ['Progress', `${Math.round(torrent.progress * 100)}%`],
    ['Ratio', torrent.ratio.toFixed(2)],
    ['Seeds', String(torrent.num_seeds)],
    ['Peers', String(torrent.num_leechs)],
    ['Save path', torrent.save_path],
    ['Category', torrent.category || '-'],
    ['Tags', torrent.tags || '-'],
  ]

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="overflow-y-auto">
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
