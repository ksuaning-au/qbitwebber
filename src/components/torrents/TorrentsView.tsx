import { useState, useMemo } from 'react'
import { 
  Play, 
  Pause, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTorrents, usePauseTorrents, useResumeTorrents, useDeleteTorrents } from '@/hooks/useApi'
import type { Torrent } from '@/types'

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

function getStateColor(state: string): string {
  if (state === 'downloading' || state === 'forcedDL' || state === 'metaDL') return 'text-blue-500'
  if (state === 'uploading' || state === 'forcedUP' || state === 'checkingUP') return 'text-green-500'
  if (state === 'pausedDL' || state === 'pausedUP') return 'text-yellow-500'
  if (state === 'error') return 'text-red-500'
  return 'text-muted-foreground'
}

function getStateLabel(state: string): string {
  const labels: Record<string, string> = {
    downloading: 'Downloading',
    pausedDL: 'Paused',
    pausedUP: 'Paused',
    uploading: 'Seeding',
    stalledDL: 'Stalled',
    stalledUP: 'Stalled',
    checkingUP: 'Checking',
    checkingDL: 'Checking',
    error: 'Error',
    forcedDL: 'Forced DL',
    forcedUP: 'Forced UP',
    forcedMetaDL: 'Meta DL',
    metaDL: 'Meta DL',
    allocating: 'Allocating',
    checkingResumeData: 'Checking',
    moving: 'Moving',
    missingFiles: 'Missing Files',
    queuedDL: 'Queued',
    queuedUP: 'Queued',
  }
  return labels[state] || state
}

type SortField = 'name' | 'size' | 'progress' | 'dlspeed' | 'upspeed' | 'eta' | 'state' | 'ratio'
type SortDirection = 'asc' | 'desc'

const PAGE_SIZE = 20

export function TorrentsView() {
  const { data: torrents, isLoading } = useTorrents()
  const pauseMutation = usePauseTorrents()
  const resumeMutation = useResumeTorrents()
  const deleteMutation = useDeleteTorrents()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const sortedTorrents = useMemo(() => {
    if (!torrents) return []
    return [...torrents].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name':
          cmp = a.name.localeCompare(b.name)
          break
        case 'size':
          cmp = a.size - b.size
          break
        case 'progress':
          cmp = a.progress - b.progress
          break
        case 'dlspeed':
          cmp = a.dlspeed - b.dlspeed
          break
        case 'upspeed':
          cmp = a.upspeed - b.upspeed
          break
        case 'eta':
          cmp = a.eta - b.eta
          break
        case 'state':
          cmp = a.state.localeCompare(b.state)
          break
        case 'ratio':
          cmp = a.ratio - b.ratio
          break
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [torrents, sortField, sortDirection])

  const totalPages = Math.ceil(sortedTorrents.length / PAGE_SIZE)
  const paginatedTorrents = sortedTorrents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const handleSelect = (hash: string, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (checked) next.add(hash)
      else next.delete(hash)
      return next
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (!sortedTorrents) return
    if (checked) {
      setSelected(new Set(sortedTorrents.map(t => t.hash)))
    } else {
      setSelected(new Set())
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1)
  }

  const handlePause = () => {
    pauseMutation.mutate(Array.from(selected))
    setSelected(new Set())
  }

  const handleResume = () => {
    resumeMutation.mutate(Array.from(selected))
    setSelected(new Set())
  }

  const handleDelete = (deleteFiles: boolean) => {
    deleteMutation.mutate({ hashes: Array.from(selected), deleteFiles })
    setSelected(new Set())
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-50" />
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1 inline" />
      : <ArrowDown className="h-4 w-4 ml-1 inline" />
  }

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading torrents...</div>
  }

  if (!torrents || torrents.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No torrents</div>
  }

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm">{selected.size} selected</span>
          <Button variant="ghost" size="sm" onClick={handleResume}>
            <Play className="h-4 w-4 mr-1" /> Resume
          </Button>
          <Button variant="ghost" size="sm" onClick={handlePause}>
            <Pause className="h-4 w-4 mr-1" /> Pause
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(false)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(true)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete + Files
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selected.size === sortedTorrents.length && sortedTorrents.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('name')} className="flex items-center hover:text-foreground">
                      Name <SortIcon field="name" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <button onClick={() => handleSort('state')} className="flex items-center hover:text-foreground">
                      Status <SortIcon field="state" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[120px]">
                    <button onClick={() => handleSort('progress')} className="flex items-center hover:text-foreground">
                      Progress <SortIcon field="progress" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[80px]">
                    <button onClick={() => handleSort('size')} className="flex items-center hover:text-foreground">
                      Size <SortIcon field="size" />
                    </button>
                  </TableHead>
                    <TableHead className="w-[100px]">
                    <button onClick={() => handleSort('dlspeed')} className="flex items-center hover:text-foreground">
                      Download <SortIcon field="dlspeed" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[100px]">
                    <button onClick={() => handleSort('upspeed')} className="flex items-center hover:text-foreground">
                      Upload <SortIcon field="upspeed" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[60px]">
                    <button onClick={() => handleSort('eta')} className="flex items-center hover:text-foreground">
                      ETA <SortIcon field="eta" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[60px]">
                    <button onClick={() => handleSort('ratio')} className="flex items-center hover:text-foreground">
                      Ratio <SortIcon field="ratio" />
                    </button>
                  </TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTorrents.map((torrent) => {
                  const isActive = !torrent.state.startsWith('paused')
                  return (
                    <TableRow key={torrent.hash} className={selected.has(torrent.hash) ? 'bg-muted' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(torrent.hash)}
                          onCheckedChange={(checked) => handleSelect(torrent.hash, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium truncate max-w-[300px]">
                        {torrent.name}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs ${getStateColor(torrent.state)}`}>
                          {getStateLabel(torrent.state)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary"
                              style={{ width: `${torrent.progress * 100}%` }}
                            />
                          </div>
                          <span className="text-xs">{Math.round(torrent.progress * 100)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatSize(torrent.size)}</TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Download className="h-3 w-3 text-blue-500" />
                          {formatSize(torrent.dlspeed)}/s
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Upload className="h-3 w-3 text-green-500" />
                          {formatSize(torrent.upspeed)}/s
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatTime(torrent.eta)}</TableCell>
                      <TableCell className="text-sm">{torrent.ratio.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => isActive ? pauseMutation.mutate([torrent.hash]) : resumeMutation.mutate([torrent.hash])}
                          >
                            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => deleteMutation.mutate({ hashes: [torrent.hash], deleteFiles: false })}>
                                Delete
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteMutation.mutate({ hashes: [torrent.hash], deleteFiles: true })} className="text-destructive">
                                Delete + Files
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, sortedTorrents.length)} of {sortedTorrents.length} torrents
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
