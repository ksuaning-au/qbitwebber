// qBittorrent serves completed torrent files itself through this endpoint,
// added in Web API 2.16.0 (qBittorrent 5.3).
const DOWNLOAD_ENDPOINT = 'api/v2/torrents/downloadFile'
const MIN_WEB_API_VERSION = [2, 16, 0]

export function supportsFileDownload(webApiVersion: string): boolean {
  const version = webApiVersion.trim().split('.').map(Number)
  if (version.some(Number.isNaN)) return false

  for (let i = 0; i < MIN_WEB_API_VERSION.length; i++) {
    const part = version[i] ?? 0
    if (part !== MIN_WEB_API_VERSION[i]) return part > MIN_WEB_API_VERSION[i]
  }
  return true
}

// `fileIndex` is the file's `index` from torrents/files. The path stays relative
// so the link also works when qBittorrent is served from a sub-path.
export function getFileDownloadUrl(hash: string, fileIndex: number): string {
  const params = new URLSearchParams({ hash, file: String(fileIndex) })
  return `${DOWNLOAD_ENDPOINT}?${params}`
}
