import { NO_LIMIT, parseShareLimits, type ShareLimitForm } from './shareLimits'

// "" leaves the choice to qBittorrent's own defaults.
export type TriState = '' | 'true' | 'false'

export interface AddTorrentOptions {
  category: string
  tags: string
  savePath: string
  useDownloadPath: TriState
  downloadPath: string
  rename: string
  contentLayout: '' | 'Original' | 'Subfolder' | 'NoSubfolder'
  autoTMM: TriState
  start: TriState
  stopCondition: 'None' | 'MetadataReceived' | 'FilesChecked'
  addToTopOfQueue: TriState
  skipChecking: boolean
  sequentialDownload: boolean
  firstLastPiecePrio: boolean
  forced: boolean
  dlLimitKiB: string
  upLimitKiB: string
  // mode "global" means qBittorrent's defaults.
  shareLimits: ShareLimitForm
}

export const DEFAULT_ADD_OPTIONS: AddTorrentOptions = {
  category: '',
  tags: '',
  savePath: '',
  useDownloadPath: '',
  downloadPath: '',
  rename: '',
  contentLayout: '',
  autoTMM: '',
  start: '',
  stopCondition: 'None',
  addToTopOfQueue: '',
  skipChecking: false,
  sequentialDownload: false,
  firstLastPiecePrio: false,
  forced: false,
  dlLimitKiB: '',
  upLimitKiB: '',
  shareLimits: { mode: 'global', ratio: '', seedingMinutes: '', inactiveMinutes: '', action: 'Default' },
}

export function parseLinks(text: string): string[] {
  return text.split('\n').map(link => link.trim()).filter(Boolean)
}

// Builds torrents/add's text fields. Returns a message instead when an option can't be used.
export function buildAddParams(options: AddTorrentOptions, links: string[], sourceCount: number): Record<string, string> | string {
  const params: Record<string, string> = {}
  if (links.length) params.urls = links.join('\n')
  if (options.category) params.category = options.category
  const tags = options.tags.split(',').map(tag => tag.trim()).filter(Boolean)
  if (tags.length) params.tags = tags.join(',')
  if (options.savePath.trim()) params.savepath = options.savePath.trim()
  if (options.useDownloadPath) params.useDownloadPath = options.useDownloadPath
  if (options.useDownloadPath === 'true' && options.downloadPath.trim()) params.downloadPath = options.downloadPath.trim()
  if (options.rename.trim()) {
    if (sourceCount !== 1) return 'A new name only works when adding one torrent'
    params.rename = options.rename.trim()
  }
  if (options.contentLayout) params.contentLayout = options.contentLayout
  if (options.autoTMM) params.autoTMM = options.autoTMM
  if (options.start) params.stopped = options.start === 'true' ? 'false' : 'true'
  if (options.start !== 'false' && options.stopCondition !== 'None') params.stopCondition = options.stopCondition
  if (options.addToTopOfQueue) params.addToTopOfQueue = options.addToTopOfQueue
  if (options.skipChecking) params.skip_checking = 'true'
  if (options.sequentialDownload) params.sequentialDownload = 'true'
  if (options.firstLastPiecePrio) params.firstLastPiecePrio = 'true'
  if (options.forced) params.forced = 'true'

  for (const [field, key] of [['dlLimitKiB', 'dlLimit'], ['upLimitKiB', 'upLimit']] as const) {
    const text = options[field].trim()
    if (!text) continue
    const kib = Number(text)
    if (!Number.isFinite(kib) || kib < 0) return 'Speed limits must be 0 or higher'
    // qBittorrent takes bytes per second, and 0 or less means no limit.
    params[key] = kib > 0 ? String(Math.round(kib * 1024)) : String(NO_LIMIT)
  }

  if (options.shareLimits.mode !== 'global') {
    const limits = parseShareLimits(options.shareLimits)
    if (!limits) return 'Check the seeding limits: use 0 or higher, with whole minutes'
    params.ratioLimit = String(limits.ratioLimit)
    params.seedingTimeLimit = String(limits.seedingTimeLimit)
    params.inactiveSeedingTimeLimit = String(limits.inactiveSeedingTimeLimit)
    params.shareLimitAction = limits.shareLimitAction
  }
  return params
}

export interface AddTorrentResult {
  success_count?: number
  failure_count?: number
  pending_count?: number
}

// qBittorrent 5.2 reports counts, and older versions answer "Ok." or "Fails.".
export function describeAddResult(result: unknown, sourceCount: number): { ok: boolean; message: string } {
  if (typeof result === 'string') {
    const ok = result.trim() !== 'Fails.'
    return { ok, message: ok ? (sourceCount === 1 ? 'Torrent added' : 'Torrents added') : "qBittorrent couldn't add them" }
  }
  const { success_count: added = 0, failure_count: failed = 0, pending_count: pending = 0 } = (result ?? {}) as AddTorrentResult
  const parts: string[] = []
  if (added) parts.push(`${added} added`)
  if (pending) parts.push(`${pending} still downloading the .torrent file`)
  if (failed) parts.push(`${failed} failed`)
  if (!parts.length) return { ok: true, message: 'Sent to qBittorrent' }
  return { ok: failed === 0, message: parts.join(', ') }
}

export interface TorrentMetadata {
  // Set when qBittorrent read a .torrent file, so it can be added by hash.
  hash?: string
  name: string
  size: number
  files: { path: string; length: number }[]
}

// torrents/fetchMetadata answers with only the hash until qBittorrent has the file list.
export function readMetadata(body: unknown): TorrentMetadata | null {
  const info = (body as { info?: { name?: string; length?: number; files?: { path: string; length: number }[] } } | null)?.info
  if (!info || !Array.isArray(info.files)) return null
  return { name: info.name ?? '', size: info.length ?? 0, files: info.files }
}
