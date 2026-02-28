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
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowUpDownIcon,
  Files
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
import { TorrentFilesDialog } from './TorrentFilesDialog'
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
  if (seconds < 0 || seconds >= 8640000) return '--'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

function getStateColor(state: string, completedOn: number): string {
  if ((state === 'pausedDL' || state === 'pausedUP') && completedOn > 0) return 'text-green-500'
  if (state === 'downloading' || state === 'forcedDL' || state === 'metaDL') return 'text-blue-500'
  if (state === 'uploading' || state === 'forcedUP' || state === 'checkingUP' || state === 'completed' || state === 'seeding') return 'text-green-500'
  if (state === 'pausedDL' || state === 'pausedUP') return 'text-yellow-500'
  if (state === 'error') return 'text-red-500'
  return 'text-muted-foreground'
}

function getStateLabel(state: string, completedOn: number): string {
  if ((state === 'pausedDL' || state === 'pausedUP') && completedOn > 0) {
    return 'Completed'
  }
  const labels: Record<string, string> = {
    downloading: 'Downloading',
    pausedDL: 'Paused',
    pausedUP: 'Paused',
    uploading: 'Seeding',
    completed: 'Completed',
    seeding: 'Seeding',
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

const sortLabels: Record<SortField, string> = {
  name: 'Name',
  state: 'Status',
  progress: 'Progress',
  size: 'Size',
  dlspeed: 'Download',
  upspeed: 'Upload',
  eta: 'ETA',
  ratio: 'Ratio',
}

function SortButton({ field, currentField, direction, onClick, children }: {
  field: SortField
  currentField: SortField
  direction: SortDirection
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button onClick={onClick} className="flex items-center hover:text-foreground">
      {children}
      {currentField !== field && <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-50" />}
      {currentField === field && (direction === 'asc'
        ? <ArrowUp className="h-4 w-4 ml-1 inline" />
        : <ArrowDown className="h-4 w-4 ml-1 inline" />
      )}
    </button>
  )
}

export function TorrentsView() {
  const { data: torrents, isLoading } = useTorrents()
  const pauseMutation = usePauseTorrents()
  const resumeMutation = useResumeTorrents()
  const deleteMutation = useDeleteTorrents()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [filesDialogTorrent, setFilesDialogTorrent] = useState<Torrent | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

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

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading torrents...</div>
  }

  if (!torrents || torrents.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No torrents</div>
  }

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg overflow-x-auto">
          <span className="text-sm whitespace-nowrap">{selected.size} selected</span>
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

      {/* Mobile Sort Dropdown */}
      <div className="md:hidden flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{sortedTorrents.length} torrents</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <ArrowUpDownIcon className="h-4 w-4 mr-2" />
              Sort: {sortLabels[sortField]}
              {sortDirection === 'asc' ? ' ↑' : ' ↓'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleSort('name')}>
              Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('state')}>
              Status {sortField === 'state' && (sortDirection === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('progress')}>
              Progress {sortField === 'progress' && (sortDirection === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('size')}>
              Size {sortField === 'size' && (sortDirection === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('dlspeed')}>
              Download {sortField === 'dlspeed' && (sortDirection === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('upspeed')}>
              Upload {sortField === 'upspeed' && (sortDirection === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('eta')}>
              ETA {sortField === 'eta' && (sortDirection === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSort('ratio')}>
              Ratio {sortField === 'ratio' && (sortDirection === 'asc' ? '↑' : '↓')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
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
                      <SortButton field="name" currentField={sortField} direction={sortDirection} onClick={() => handleSort('name')}>
                        Name
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-[100px]">
                      <SortButton field="state" currentField={sortField} direction={sortDirection} onClick={() => handleSort('state')}>
                        Status
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-[120px]">
                      <SortButton field="progress" currentField={sortField} direction={sortDirection} onClick={() => handleSort('progress')}>
                        Progress
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-[80px]">
                      <SortButton field="size" currentField={sortField} direction={sortDirection} onClick={() => handleSort('size')}>
                        Size
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-[80px]">
                      <SortButton field="dlspeed" currentField={sortField} direction={sortDirection} onClick={() => handleSort('dlspeed')}>
                        Download
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-[80px]">
                      <SortButton field="upspeed" currentField={sortField} direction={sortDirection} onClick={() => handleSort('upspeed')}>
                        Upload
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-[60px]">
                      <SortButton field="eta" currentField={sortField} direction={sortDirection} onClick={() => handleSort('eta')}>
                        ETA
                      </SortButton>
                    </TableHead>
                    <TableHead className="w-[60px]">
                      <SortButton field="ratio" currentField={sortField} direction={sortDirection} onClick={() => handleSort('ratio')}>
                        Ratio
                      </SortButton>
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
                        <TableCell className="text-xs truncate max-w-[300px]">
                          {torrent.name}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs ${getStateColor(torrent.state, torrent.completion_on)}`}>
                            {getStateLabel(torrent.state, torrent.completion_on)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary" style={{ width: `${torrent.progress * 100}%` }} />
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 mr-2" onClick={() => isActive ? pauseMutation.mutate([torrent.hash]) : resumeMutation.mutate([torrent.hash])}>
                              {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFilesDialogTorrent(torrent)}>
                              <Files className="h-4 w-4 mr-2" />
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
          </CardContent>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {paginatedTorrents.map((torrent) => {
          const isActive = !torrent.state.startsWith('paused')
          const isExpanded = expandedCard === torrent.hash
          return (
            <Card key={torrent.hash} className={(selected.has(torrent.hash) ? 'border-primary' : '') + " py-3"}>
              <CardContent className="px-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selected.has(torrent.hash)}
                    onCheckedChange={(checked) => handleSelect(torrent.hash, !!checked)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedCard(isExpanded ? null : torrent.hash)}>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`${getStateColor(torrent.state, torrent.completion_on)} flex-shrink-0`}>
                        {getStateLabel(torrent.state, torrent.completion_on)}
                      </span>
                      <span className="text-muted-foreground flex-shrink-0 ml-2">
                        {Math.round(torrent.progress * 100)}%
                      </span>
                    </div>
                    <p className="font-medium text-xs truncate max-w-[180px]">{torrent.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span className="flex-shrink-0">{formatSize(torrent.size)}</span>
                      <span className="flex items-center gap-0.5 flex-shrink-0">
                        <Download className="h-2.5 w-2.5 text-blue-500" />
                        {formatSize(torrent.dlspeed)}
                      </span>
                      <span className="flex items-center gap-0.5 flex-shrink-0">
                        <Upload className="h-2.5 w-2.5 text-green-500" />
                        {formatSize(torrent.upspeed)}
                      </span>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-1 pt-1 border-t space-y-1 text-[10px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ETA:</span>
                          <span>{formatTime(torrent.eta)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ratio:</span>
                          <span>{torrent.ratio.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Seeds:</span>
                          <span>{torrent.num_seeds}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Peers:</span>
                          <span>{torrent.num_leechs}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={() => setExpandedCard(isExpanded ? null : torrent.hash)}>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="mt-1 h-1 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${torrent.progress * 100}%` }} />
                </div>

                {/* Action buttons - always visible on mobile */}
                <div className="flex items-center gap-1 mt-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => isActive ? pauseMutation.mutate([torrent.hash]) : resumeMutation.mutate([torrent.hash])}>
                    {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFilesDialogTorrent(torrent)}>
                    <Files className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate({ hashes: [torrent.hash], deleteFiles: false })}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            {sortedTorrents.length} torrents
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {currentPage} / {totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <TorrentFilesDialog
        torrent={filesDialogTorrent}
        open={!!filesDialogTorrent}
        onOpenChange={(open) => !open && setFilesDialogTorrent(null)}
      />
    </div>
  )
}
