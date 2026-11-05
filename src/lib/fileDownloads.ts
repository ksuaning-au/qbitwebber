import type { Torrent } from '@/types'

// qBittorrent's Web API cannot serve the content of a torrent, so files are
// downloaded from a separate HTTP file server (nginx, a seedbox's file area, ...)
// that exposes the download directory. These settings describe that mapping and
// are stored per browser.
const SETTINGS_KEY = 'qbit_file_downloads'

export interface FileDownloadSettings {
  // URL the file server exposes the root path at, e.g. https://example.com/files/
  // May be relative to the WebUI, e.g. ../files/
  baseUrl: string
  // Directory on the server that baseUrl points to, e.g. /home/user/downloads
  // When empty, baseUrl is taken to point directly at the torrent's save path.
  rootPath: string
}

export function loadFileDownloadSettings(): FileDownloadSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    return {
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
      rootPath: typeof parsed.rootPath === 'string' ? parsed.rootPath : '',
    }
  } catch {
    return { baseUrl: '', rootPath: '' }
  }
}

export function saveFileDownloadSettings(settings: FileDownloadSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

// Returns the base URL as an absolute http(s) URL ending in a slash, or null if
// it is empty or uses another scheme (this ends up in a link, so javascript: and
// the like must never get through).
export function parseBaseUrl(baseUrl: string): URL | null {
  const trimmed = baseUrl.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed, window.location.href)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    url.search = ''
    url.hash = ''
    if (!url.pathname.endsWith('/')) url.pathname += '/'
    return url
  } catch {
    return null
  }
}

function pathSegments(path: string): string[] {
  return path.replace(/\\/g, '/').split('/').filter(Boolean)
}

// Files of an unfinished torrent stay in the incomplete directory if one is set.
function torrentDirectory(torrent: Torrent): string {
  return torrent.progress < 1 && torrent.download_path ? torrent.download_path : torrent.save_path
}

// Builds the link for a file of a torrent. `fileName` is the path relative to
// the torrent's directory, as returned by torrents/files. Returns null when the
// file is not reachable through the configured file server.
export function getFileDownloadUrl(
  settings: FileDownloadSettings,
  torrent: Torrent,
  fileName: string,
): string | null {
  const base = parseBaseUrl(settings.baseUrl)
  if (!base) return null

  const root = pathSegments(settings.rootPath)
  const directory = pathSegments(torrentDirectory(torrent))
  const relativeDirectory = settings.rootPath.trim() ? directory.slice(root.length) : []
  if (root.some((segment, i) => directory[i] !== segment)) return null

  const segments = [...relativeDirectory, ...pathSegments(fileName)]
  if (segments.some(segment => segment === '.' || segment === '..')) return null

  return base.href + segments.map(encodeURIComponent).join('/')
}
