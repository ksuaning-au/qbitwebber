import { useState, useMemo, useRef } from 'react'
import { Search as SearchIcon, Loader2, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'
import type { SearchResult } from '@/types'

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

type SortField = 'fileName' | 'fileSize' | 'nbSeeders' | 'nbLeechers' | 'siteUrl'
type SortDirection = 'asc' | 'desc'

const PAGE_SIZE = 20

export function SearchView() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [sortField, setSortField] = useState<SortField>('nbSeeders')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [cancelSearch, setCancelSearch] = useState(false);
  const cancelSearchRef = useRef(false)
  const currentSearchIdRef = useRef<number | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setCancelSearch(false)
    cancelSearchRef.current = false
    setIsSearching(true)
    setSearched(true)
    setResults([])
    setCurrentPage(1)

    try {
      const { id } = await qbitClient.startSearch(query)

      currentSearchIdRef.current = id

      if (!id) {
        toast.error('Search not available - no plugins configured')
        return
      }
      let attempts = 0
      while (attempts < 60 && !cancelSearchRef.current) {
        await new Promise(resolve => setTimeout(resolve, 1000))

        const { results: searchResults, status } = await qbitClient.getSearchResults(id)

        if (searchResults && searchResults.length > 0) {
          setResults(searchResults)
        }

        if (status === 'Stopped' || status === 'Completed') {
          break
        }
        attempts++
      }
    } catch (err) {
      console.error('Search error:', err)
      toast.error('Search not available. Please configure search plugins in qBittorrent.')
    } finally {
      setIsSearching(false)
      currentSearchIdRef.current = null
      cancelSearchRef.current = false
      setCancelSearch(false)
    }
  }

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      let aVal: string | number = a[sortField]
      let bVal: string | number = b[sortField]

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [results, sortField, sortDirection])

  const totalPages = Math.ceil(sortedResults.length / PAGE_SIZE)
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const handleDownload = async () => {
    if (!selectedResult?.fileUrl) return

    setIsDownloading(true)
    try {
      await qbitClient.addTorrentUrl(selectedResult.fileUrl)
      toast.success('Torrent added to download queue')
      setSelectedResult(null)
    } catch (err) {
      console.error('Download error:', err)
      toast.error('Failed to add torrent')
    } finally {
      setIsDownloading(false)
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-50" />
    return sortDirection === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1 inline" />
      : <ArrowDown className="h-4 w-4 ml-1 inline" />
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Search Torrents</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="Search query..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              required
            />
            <Button type="submit" disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SearchIcon className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isSearching && (
        <div className="text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">
            Searching... {results.length > 0 && `(${results.length} results found)`}
          </p>
          <Button onClick={async () => {
            // set both ref and state (state is used for UI, ref for immediate loop control)
            cancelSearchRef.current = true
            setCancelSearch(true)

            const id = currentSearchIdRef.current
            if (id != null) {
              try {
                await qbitClient.stopSearch(id)
              } catch (err) {
                console.warn('Failed to stop search on server', err)
              }
            }
          }}>
            Cancel
          </Button>
        </div>
      )}

      {searched && !isSearching && results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No results found
        </div>
      )}

      {results.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">
                      <button onClick={() => handleSort('fileName')} className="flex items-center hover:text-foreground">
                        Name <SortIcon field="fileName" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort('fileSize')} className="flex items-center hover:text-foreground">
                        Size <SortIcon field="fileSize" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort('nbSeeders')} className="flex items-center hover:text-foreground">
                        Seeds <SortIcon field="nbSeeders" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort('nbLeechers')} className="flex items-center hover:text-foreground">
                        Leeches <SortIcon field="nbLeechers" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => handleSort('siteUrl')} className="flex items-center hover:text-foreground">
                        Source <SortIcon field="siteUrl" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedResults.map((result, index) => (
                    <TableRow
                      key={index}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => result.fileUrl && setSelectedResult(result)}
                    >
                      <TableCell className="font-medium truncate max-w-[300px]">
                        {result.fileName}
                      </TableCell>
                      <TableCell>{formatSize(result.fileSize)}</TableCell>
                      <TableCell className="text-green-500">{result.nbSeeders}</TableCell>
                      <TableCell className="text-red-500">{result.nbLeechers}</TableCell>
                      <TableCell className="text-muted-foreground truncate max-w-[150px]">
                        {result.siteUrl}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {result.fileUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedResult(result)
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          {result.descrLink && (
                            <a
                              href={result.descrLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center justify-center w-8 h-8 rounded hover:bg-accent"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, sortedResults.length)} of {sortedResults.length} results
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
      )}

      {/* Download Dialog */}
      <Dialog open={!!selectedResult} onOpenChange={() => setSelectedResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Torrent</DialogTitle>
            <DialogDescription>
              Would you like to download this torrent?
            </DialogDescription>
          </DialogHeader>
          {selectedResult && (
            <div className="py-4">
              <p className="font-medium">{selectedResult.fileName}</p>
              <div className="text-sm text-muted-foreground mt-2 space-y-1">
                <p>Size: {formatSize(selectedResult.fileSize)}</p>
                <p>Seeds: {selectedResult.nbSeeders} | Leechers: {selectedResult.nbLeechers}</p>
                <p>Source: {selectedResult.siteUrl}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedResult(null)}>
              Cancel
            </Button>
            <Button onClick={handleDownload} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
