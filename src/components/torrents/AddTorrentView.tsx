import { useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react'
import { Loader2, Upload, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCategories, useTags } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'
import { qbitClient } from '@/lib/api'
import {
  DEFAULT_ADD_OPTIONS,
  buildAddParams,
  describeAddResult,
  parseLinks,
  readMetadata,
  type AddTorrentOptions,
  type TorrentMetadata,
} from '@/lib/addTorrent'
import { formatSize } from '@/lib/utils'
import { TorrentCreator } from './TorrentCreator'

const selectClass = 'border-input dark:bg-input/30 h-9 w-full rounded-md border bg-transparent px-2 text-sm'
const METADATA_POLL_MS = 1500
const METADATA_TIMEOUT_MS = 120000

// qBittorrent's file priorities: 0 skips the file.
const FILE_PRIORITIES = [
  { value: 1, label: 'Normal' },
  { value: 6, label: 'High' },
  { value: 7, label: 'Maximum' },
  { value: 0, label: "Don't download" },
]

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor} className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function TriSelect({ id, value, onChange, labels }: { id: string; value: string; onChange: (value: '' | 'true' | 'false') => void; labels: [string, string, string] }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as '' | 'true' | 'false')} className={selectClass}>
      <option value="">{labels[0]}</option>
      <option value="true">{labels[1]}</option>
      <option value="false">{labels[2]}</option>
    </select>
  )
}

function CheckField({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(!!value)} />
      <Label htmlFor={id} className="text-sm font-normal">{label}</Label>
    </div>
  )
}

export function AddTorrentView() {
  const queryClient = useQueryClient()
  const { data: categories } = useCategories()
  const { data: tags } = useTags()
  const [links, setLinks] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [options, setOptions] = useState<AddTorrentOptions>(DEFAULT_ADD_OPTIONS)
  const [showOptions, setShowOptions] = useState(false)
  const [adding, setAdding] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Choosing files before adding only works for a single link, as qBittorrent requires.
  const [metadata, setMetadata] = useState<TorrentMetadata | null>(null)
  const [metadataSource, setMetadataSource] = useState<string | null>(null)
  const [priorities, setPriorities] = useState<number[]>([])
  const [fetchingMetadata, setFetchingMetadata] = useState(false)
  const fetchRun = useRef(0)

  const linkList = parseLinks(links)
  const sourceCount = linkList.length + files.length
  // qBittorrent can apply a file choice to one torrent at a time, from a link or a .torrent file.
  const singleSource = linkList.length === 1 && files.length === 0 ? linkList[0] : linkList.length === 0 && files.length === 1 ? files[0] : null
  const canChooseFiles = singleSource !== null
  const sourceKey = typeof singleSource === 'string' ? singleSource : singleSource ? `file:${singleSource.name}:${singleSource.size}` : null
  // The file choice belongs to the source it was read from.
  const activeMetadata = metadata && metadataSource === sourceKey && canChooseFiles ? metadata : null

  // Stops a running file-list request when the page closes.
  useEffect(() => () => { fetchRun.current++ }, [])

  const set = <K extends keyof AddTorrentOptions>(key: K, value: AddTorrentOptions[K]) => setOptions(prev => ({ ...prev, [key]: value }))

  const addFiles = (list: FileList | null) => {
    const torrents = Array.from(list ?? []).filter(file => file.name.toLowerCase().endsWith('.torrent'))
    if (list?.length && torrents.length < list.length) toast.error('Only .torrent files can be added')
    setFiles(prev => [...prev, ...torrents.filter(file => !prev.some(p => p.name === file.name && p.size === file.size))])
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const stopFetching = () => {
    fetchRun.current++
    setFetchingMetadata(false)
  }

  const fetchFileList = async () => {
    const run = ++fetchRun.current
    setFetchingMetadata(true)
    setMetadata(null)
    const started = Date.now()
    if (singleSource instanceof File) {
      try {
        // qBittorrent reads the file and keeps it, so it can be added by hash with the chosen files.
        const [parsed] = await qbitClient.parseMetadata([singleSource])
        const found = readMetadata(parsed)
        const hash = (parsed as { hash?: string } | undefined)?.hash
        if (fetchRun.current !== run) return
        if (!found || !hash) throw new Error("qBittorrent didn't return the file list")
        setMetadata({ ...found, hash })
        setMetadataSource(sourceKey)
        setPriorities(found.files.map(() => 1))
      } catch (error) {
        if (fetchRun.current !== run) return
        const message = error instanceof Error ? error.message : ''
        toast.error("Couldn't read the .torrent file", { description: message.includes('404') ? 'This needs qBittorrent 5.2 or newer.' : message || undefined })
      } finally {
        if (fetchRun.current === run) setFetchingMetadata(false)
      }
      return
    }
    const source = linkList[0]
    try {
      while (fetchRun.current === run) {
        const found = readMetadata(await qbitClient.fetchMetadata(source))
        if (fetchRun.current !== run) return
        if (found) {
          setMetadata(found)
          setMetadataSource(source)
          setPriorities(found.files.map(() => 1))
          return
        }
        if (Date.now() - started > METADATA_TIMEOUT_MS) {
          toast.error("Couldn't get the file list in time", { description: 'A magnet link needs peers to share it. You can still add the torrent without choosing files.' })
          return
        }
        await new Promise(resolve => setTimeout(resolve, METADATA_POLL_MS))
      }
    } catch (error) {
      if (fetchRun.current !== run) return
      const message = error instanceof Error ? error.message : ''
      toast.error("Couldn't get the file list", {
        description: message.includes('404') ? 'This needs qBittorrent 5.2 or newer.' : message || undefined,
      })
    } finally {
      if (fetchRun.current === run) setFetchingMetadata(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (sourceCount === 0) {
      toast.error('Add a link or a .torrent file')
      return
    }
    // A .torrent read for its file list is added by hash, which picks up the copy qBittorrent kept.
    const addByHash = activeMetadata?.hash && singleSource instanceof File ? activeMetadata.hash : null
    const params = buildAddParams(options, addByHash ? [addByHash] : linkList, sourceCount)
    if (typeof params === 'string') {
      toast.error(params)
      return
    }
    if (activeMetadata && priorities.every(priority => priority === 0)) {
      toast.error('Choose at least one file to download')
      return
    }

    setAdding(true)
    try {
      const result = await qbitClient.addTorrents(params, addByHash ? [] : files, activeMetadata ? priorities : undefined)
      const { ok, message } = describeAddResult(result, sourceCount)
      if (ok) {
        toast.success(message)
        setLinks('')
        setFiles([])
        setMetadata(null)
        setOptions(prev => ({ ...prev, rename: '' }))
        if (fileInputRef.current) fileInputRef.current.value = ''
      } else {
        toast.error(message)
      }
      queryClient.invalidateQueries({ queryKey: ['torrents'] })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      toast.error("Couldn't add the torrent", {
        description: message.includes('409') ? 'qBittorrent rejected it. It may already be in your list, or the link may be invalid.' : message || undefined,
      })
    } finally {
      setAdding(false)
    }
  }

  const categoryNames = Object.keys(categories ?? {}).sort()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Torrent</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Magnet or torrent links, one per line" htmlFor="add-links">
              <textarea
                id="add-links"
                rows={3}
                value={links}
                onChange={(e) => setLinks(e.target.value)}
                placeholder="magnet:?xt=..."
                className="border-input dark:bg-input/30 w-full rounded-md border bg-transparent px-3 py-2 text-sm"
              />
            </Field>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`space-y-2 rounded-md border border-dashed p-3 text-sm ${dragging ? 'border-primary bg-muted' : ''}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose .torrent files
                </Button>
                <span className="text-xs text-muted-foreground">or drop them here</span>
                <input ref={fileInputRef} type="file" accept=".torrent,application/x-bittorrent" multiple className="hidden" aria-label="Torrent files" onChange={(e) => addFiles(e.target.files)} />
              </div>
              {files.length > 0 && (
                <ul className="space-y-1">
                  {files.map(file => (
                    <li key={`${file.name}-${file.size}`} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={`Remove ${file.name}`} onClick={() => setFiles(prev => prev.filter(f => f !== file))}>
                        <X className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {canChooseFiles && (
              <div className="space-y-2 rounded-md border p-3 text-sm">
                {!activeMetadata ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={fetchingMetadata} onClick={fetchFileList}>
                      {fetchingMetadata && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {fetchingMetadata ? 'Getting file list...' : 'Choose files first'}
                    </Button>
                    {fetchingMetadata && <Button type="button" size="sm" variant="ghost" onClick={stopFetching}>Stop</Button>}
                    <span className="text-xs text-muted-foreground">{singleSource instanceof File ? 'Optional.' : 'Optional. Magnet links need peers to share the list.'}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium break-all">{activeMetadata.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatSize(activeMetadata.files.reduce((sum, file, i) => sum + (priorities[i] > 0 ? file.length : 0), 0))} of {formatSize(activeMetadata.size)} selected
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPriorities(activeMetadata.files.map(() => 1))}>Select all</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setPriorities(activeMetadata.files.map(() => 0))}>Select none</Button>
                    </div>
                    <ul className="max-h-64 space-y-1 overflow-y-auto">
                      {activeMetadata.files.map((file, i) => (
                        <li key={file.path} className="flex items-center gap-2">
                          <Checkbox
                            aria-label={`Download ${file.path}`}
                            checked={priorities[i] > 0}
                            onCheckedChange={(checked) => setPriorities(prev => prev.map((p, j) => (j === i ? (checked ? 1 : 0) : p)))}
                          />
                          <span className="min-w-0 flex-1 break-all text-xs">{file.path}</span>
                          <span className="flex-shrink-0 text-xs text-muted-foreground">{formatSize(file.length)}</span>
                          <select
                            aria-label={`Priority for ${file.path}`}
                            value={priorities[i]}
                            onChange={(e) => setPriorities(prev => prev.map((p, j) => (j === i ? Number(e.target.value) : p)))}
                            className="border-input dark:bg-input/30 h-7 flex-shrink-0 rounded-md border bg-transparent px-1 text-xs"
                          >
                            {FILE_PRIORITIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                          </select>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Category" htmlFor="add-category">
                <select id="add-category" value={options.category} onChange={(e) => set('category', e.target.value)} className={selectClass}>
                  <option value="">No category</option>
                  {categoryNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </Field>
              <Field label="Tags, separated by commas" htmlFor="add-tags">
                <Input id="add-tags" list="add-tag-list" value={options.tags} onChange={(e) => set('tags', e.target.value)} className="h-9" />
                <datalist id="add-tag-list">{(tags ?? []).map(tag => <option key={tag} value={tag} />)}</datalist>
              </Field>
            </div>

            <Field label="Save path (blank = default)" htmlFor="add-save-path">
              <Input id="add-save-path" value={options.savePath} onChange={(e) => set('savePath', e.target.value)} className="h-9" />
            </Field>

            <Button type="button" variant="ghost" size="sm" aria-expanded={showOptions} onClick={() => setShowOptions(!showOptions)}>
              {showOptions ? 'Hide options' : 'More options'}
            </Button>

            {showOptions && (
              <div className="space-y-3 rounded-md border p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="When added" htmlFor="add-start">
                    <TriSelect id="add-start" value={options.start} onChange={(value) => set('start', value)} labels={["qBittorrent's default", 'Start', "Don't start"]} />
                  </Field>
                  <Field label="Stop when" htmlFor="add-stop-condition">
                    <select id="add-stop-condition" value={options.stopCondition} disabled={options.start === 'false'} onChange={(e) => set('stopCondition', e.target.value as AddTorrentOptions['stopCondition'])} className={selectClass}>
                      <option value="None">Never</option>
                      <option value="MetadataReceived">Metadata is received</option>
                      <option value="FilesChecked">Files are checked</option>
                    </select>
                  </Field>
                  <Field label="Content layout" htmlFor="add-layout">
                    <select id="add-layout" value={options.contentLayout} onChange={(e) => set('contentLayout', e.target.value as AddTorrentOptions['contentLayout'])} className={selectClass}>
                      <option value="">qBittorrent's default</option>
                      <option value="Original">Original</option>
                      <option value="Subfolder">Create subfolder</option>
                      <option value="NoSubfolder">Don't create subfolder</option>
                    </select>
                  </Field>
                  <Field label="Automatic management" htmlFor="add-auto-tmm">
                    <TriSelect id="add-auto-tmm" value={options.autoTMM} onChange={(value) => set('autoTMM', value)} labels={["qBittorrent's default", 'On', 'Off']} />
                  </Field>
                  <Field label="Add to top of queue" htmlFor="add-queue-top">
                    <TriSelect id="add-queue-top" value={options.addToTopOfQueue} onChange={(value) => set('addToTopOfQueue', value)} labels={["qBittorrent's default", 'Yes', 'No']} />
                  </Field>
                  <Field label="Separate folder for incomplete files" htmlFor="add-use-download-path">
                    <TriSelect id="add-use-download-path" value={options.useDownloadPath} onChange={(value) => set('useDownloadPath', value)} labels={["qBittorrent's default", 'Yes', 'No']} />
                  </Field>
                </div>

                {options.useDownloadPath === 'true' && (
                  <Field label="Folder for incomplete files (blank = default)" htmlFor="add-download-path">
                    <Input id="add-download-path" value={options.downloadPath} onChange={(e) => set('downloadPath', e.target.value)} className="h-9" />
                  </Field>
                )}

                {sourceCount <= 1 && (
                  <Field label="Rename torrent (blank = keep its name)" htmlFor="add-rename">
                    <Input id="add-rename" value={options.rename} onChange={(e) => set('rename', e.target.value)} className="h-9" />
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Download limit (KiB/s)" htmlFor="add-dl-limit">
                    <Input id="add-dl-limit" type="number" min={0} placeholder="No limit" value={options.dlLimitKiB} onChange={(e) => set('dlLimitKiB', e.target.value)} className="h-9" />
                  </Field>
                  <Field label="Upload limit (KiB/s)" htmlFor="add-up-limit">
                    <Input id="add-up-limit" type="number" min={0} placeholder="No limit" value={options.upLimitKiB} onChange={(e) => set('upLimitKiB', e.target.value)} className="h-9" />
                  </Field>
                </div>

                <Field label="Seeding limits" htmlFor="add-share-mode">
                  <select id="add-share-mode" value={options.shareLimits.mode} onChange={(e) => set('shareLimits', { ...options.shareLimits, mode: e.target.value as AddTorrentOptions['shareLimits']['mode'] })} className={selectClass}>
                    <option value="global">qBittorrent's global limits</option>
                    <option value="none">No limit</option>
                    <option value="custom">Custom limits</option>
                  </select>
                </Field>
                {options.shareLimits.mode === 'custom' && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Field label="Ratio" htmlFor="add-ratio">
                      <Input id="add-ratio" type="number" min={0} step="any" placeholder="No limit" value={options.shareLimits.ratio} onChange={(e) => set('shareLimits', { ...options.shareLimits, ratio: e.target.value })} className="h-9" />
                    </Field>
                    <Field label="Seeding time (minutes)" htmlFor="add-seeding-time">
                      <Input id="add-seeding-time" type="number" min={0} step={1} placeholder="No limit" value={options.shareLimits.seedingMinutes} onChange={(e) => set('shareLimits', { ...options.shareLimits, seedingMinutes: e.target.value })} className="h-9" />
                    </Field>
                    <Field label="Inactive time (minutes)" htmlFor="add-inactive-time">
                      <Input id="add-inactive-time" type="number" min={0} step={1} placeholder="No limit" value={options.shareLimits.inactiveMinutes} onChange={(e) => set('shareLimits', { ...options.shareLimits, inactiveMinutes: e.target.value })} className="h-9" />
                    </Field>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <CheckField id="add-skip-check" label="Skip hash check" checked={options.skipChecking} onChange={(value) => set('skipChecking', value)} />
                  <CheckField id="add-sequential" label="Sequential download" checked={options.sequentialDownload} onChange={(value) => set('sequentialDownload', value)} />
                  <CheckField id="add-first-last" label="First and last pieces first" checked={options.firstLastPiecePrio} onChange={(value) => set('firstLastPiecePrio', value)} />
                  <CheckField id="add-forced" label="Force start" checked={options.forced} onChange={(value) => set('forced', value)} />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={adding}>
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {sourceCount > 1 ? `Add ${sourceCount} torrents` : 'Add torrent'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <TorrentCreator />
    </div>
  )
}
