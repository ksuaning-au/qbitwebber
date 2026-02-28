import { useState } from 'react'
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
import { useTorrentFiles, useSetFilePriority } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import type { Torrent, TorrentFile } from '@/types'

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

interface FileTreeProps {
  files: TorrentFile[]
  hash: string
  onPriorityChange: (id: string, priority: number) => void
}

function FileTree({ files, hash, onPriorityChange }: FileTreeProps) {
  // Build a simple tree structure
  interface TreeNode {
    name: string
    path: string
    isFile: boolean
    size: number
    progress: number
    priority: number
    index: number
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
          onClick={() => onPriorityChange(String(node.index), isSelected ? 0 : 2)}
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
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TorrentFilesDialog({ torrent, open, onOpenChange }: TorrentFilesDialogProps) {
  const { data: files, isLoading } = useTorrentFiles(torrent?.hash ?? null)
  const setPriority = useSetFilePriority()
  const [selectedHash, setSelectedHash] = useState<string | null>(null)

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{torrent.name}</DialogTitle>
        </DialogHeader>
        
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
              hash={torrent.hash}
              onPriorityChange={handlePriorityChange}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">No files</div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
