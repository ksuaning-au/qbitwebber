export interface CreatorForm {
  sourcePath: string
  format: 'hybrid' | 'v2' | 'v1'
  // Bytes. 0 lets qBittorrent choose.
  pieceSize: number
  isPrivate: boolean
  startSeeding: boolean
  optimizeAlignment: boolean
  trackers: string
  urlSeeds: string
  comment: string
  source: string
  // Where qBittorrent saves the .torrent on its machine. Blank keeps it for downloading here.
  torrentFilePath: string
}

export const DEFAULT_CREATOR_FORM: CreatorForm = {
  sourcePath: '',
  format: 'hybrid',
  pieceSize: 0,
  isPrivate: false,
  startSeeding: true,
  optimizeAlignment: true,
  trackers: '',
  urlSeeds: '',
  comment: '',
  source: '',
  torrentFilePath: '',
}

// The same choices as qBittorrent's own creator: automatic, then 16 KiB to 128 MiB.
export const PIECE_SIZES = [0, ...Array.from({ length: 14 }, (_, i) => 1024 << (i + 4))]

// qBittorrent splits these on | and percent-decodes each one. Blank lines between trackers start a new tier.
export function encodeUrlList(text: string): string {
  return text.split('\n').map(line => encodeURIComponent(line.trim())).join('|')
}

export function buildCreatorParams(form: CreatorForm, libtorrentV2: boolean): Record<string, string> | string {
  const sourcePath = form.sourcePath.trim()
  if (!sourcePath) return 'Choose the file or folder to share'
  const params: Record<string, string> = {
    sourcePath,
    pieceSize: String(form.pieceSize),
    private: String(form.isPrivate),
    startSeeding: String(form.startSeeding),
  }
  // libtorrent 2 can make v2 and hybrid torrents, while 1.x only aligns files.
  if (libtorrentV2) params.format = form.format
  else params.optimizeAlignment = String(form.optimizeAlignment)
  if (form.trackers.trim()) params.trackers = encodeUrlList(form.trackers.trim())
  if (form.urlSeeds.trim()) params.urlSeeds = encodeUrlList(form.urlSeeds.trim())
  if (form.comment.trim()) params.comment = form.comment.trim()
  if (form.source.trim()) params.source = form.source.trim()
  if (form.torrentFilePath.trim()) params.torrentFilePath = form.torrentFilePath.trim()
  return params
}

export function isLibtorrentV2(version: unknown): boolean {
  return typeof version === 'string' && Number(version.split('.')[0]) >= 2
}
