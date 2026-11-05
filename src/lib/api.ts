import type {
  Torrent,
  TorrentFile,
  TorrentTracker,
  RSSFeed,
  RSSItem,
  RSSRule,
  SearchResult,
  LogEntry,
  TransferInfo,
  TorrentCategory,
  TorrentPeer,
  WebSeed,
  PeerLogEntry,
  Cookie
} from '@/types'
import type { ShareLimits } from './shareLimits'
import { encodeTrackerUrls } from './trackers'
import type { MainDataUpdate } from './mainData'

import { demoClient } from './demoClient'
import { flattenRSSTree, listRSSFolders, type RawRSSTree } from './rss'

// All API paths are relative (no leading slash) so the UI also works when
// qBittorrent is served from a sub-path behind a reverse proxy,
// e.g. https://example.com/qbittorrent/
const API_BASE = 'api/v2'

// Only the username is remembered (for display / convenience).
// The password is never persisted; authentication relies on the
// HttpOnly session cookie that qBittorrent sets on login.
const USERNAME_KEY = 'qbit_user'
const LEGACY_PASSWORD_KEY = 'qbit_pass'

function readStoredUsername(): string {
  try {
    return localStorage.getItem(USERNAME_KEY) || 'admin'
  } catch {
    return 'admin'
  }
}

export type QueueMove = 'top' | 'up' | 'down' | 'bottom'

const QUEUE_ENDPOINTS: Record<QueueMove, string> = {
  top: 'topPrio',
  up: 'increasePrio',
  down: 'decreasePrio',
  bottom: 'bottomPrio',
}

// A link rather than a call, so the browser saves the file itself.
export function getTorrentExportUrl(hash: string): string {
  return `${API_BASE}/torrents/export?hash=${encodeURIComponent(hash)}`
}

class QBittorrentClient {
  private username: string
  private password = ''
  private authenticated = false
  private unauthorizedHandler: (() => void) | null = null

  constructor() {
    this.username = readStoredUsername()
    // Remove plaintext passwords stored by earlier versions.
    try {
      localStorage.removeItem(LEGACY_PASSWORD_KEY)
    } catch {
      // storage unavailable – nothing to clean up
    }
  }

  setCredentials(username: string, password: string) {
    this.username = username
    this.password = password
    try {
      localStorage.setItem(USERNAME_KEY, username)
    } catch {
      // storage unavailable – username is kept in memory only
    }
  }

  getUsername() {
    return this.username
  }

  isConfigured(): boolean {
    return this.authenticated
  }

  /** Called whenever the backend rejects a request because the session expired. */
  onUnauthorized(handler: (() => void) | null) {
    this.unauthorizedHandler = handler
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE}/${endpoint}`, {
      credentials: 'same-origin',
      ...options,
    })

    const responseText = await response.text()

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        this.authenticated = false
        this.unauthorizedHandler?.()
        throw new Error('Authentication required')
      }
      throw new Error(`Request failed: ${response.status} - ${responseText}`)
    }

    try {
      return JSON.parse(responseText)
    } catch {
      return responseText as T
    }
  }

  /** Returns true if the browser already holds a valid qBittorrent session. */
  async checkSession(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/app/version`, { credentials: 'same-origin' })
      this.authenticated = response.ok
    } catch {
      this.authenticated = false
    }
    return this.authenticated
  }

  async login(): Promise<boolean> {
    const formData = new URLSearchParams()
    formData.append('username', this.username)
    formData.append('password', this.password)
    // Do not keep the password in memory longer than needed.
    this.password = ''

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    })

    // qBittorrent >= 5.2: success is HTTP 204 with an empty body.
    // qBittorrent <  5.2: success is HTTP 200 "Ok.", failure is HTTP 200 "Fails.".
    if (response.status === 204) {
      this.authenticated = true
    } else {
      const text = (await response.text()).trim()
      this.authenticated = response.ok && text === 'Ok.'
    }
    return this.authenticated
  }

  async logout(): Promise<void> {
    this.authenticated = false
    // qBittorrent 5.x only accepts POST for auth/logout.
    await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'same-origin' }).catch(() => {})
  }

  async getAppVersion(): Promise<string> {
    return this.request<string>('app/version')
  }

  async getWebApiVersion(): Promise<string> {
    // String() because a two-part version such as "2.8" parses as a JSON number.
    return String(await this.request<string | number>('app/webapiVersion'))
  }

  async getPreferences(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('app/preferences')
  }

  async setPreferences(prefs: Record<string, unknown>): Promise<void> {
    const body = new URLSearchParams()
    body.append('json', JSON.stringify(prefs))
    await this.request('app/setPreferences', {
      method: 'POST',
      body,
    })
  }

  // Full paths of the folders (or files too) inside `dirPath` on qBittorrent's machine.
  async getDirectoryContent(dirPath: string, mode: 'dirs' | 'all'): Promise<string[]> {
    return this.request(`app/getDirectoryContent?${new URLSearchParams({ dirPath, mode })}`)
  }

  async getCookies(): Promise<Cookie[]> {
    return this.request('app/cookies')
  }

  async setCookies(cookies: Cookie[]): Promise<void> {
    await this.post('app/setCookies', { cookies: JSON.stringify(cookies) })
  }

  async rotateApiKey(): Promise<string> {
    const result = await this.request<{ apiKey?: string }>('app/rotateAPIKey', { method: 'POST' })
    return result.apiKey ?? ''
  }

  async deleteApiKey(): Promise<void> {
    await this.request('app/deleteAPIKey', { method: 'POST' })
  }

  async getNetworkInterfaces(): Promise<{ name: string; value: string }[]> {
    return this.request('app/networkInterfaceList')
  }

  async getInterfaceAddresses(iface: string): Promise<string[]> {
    return this.request(`app/networkInterfaceAddressList?iface=${encodeURIComponent(iface)}`)
  }

  async sendTestEmail(): Promise<void> {
    await this.request('app/sendTestEmail', { method: 'POST' })
  }

  async revertToDefaultWebUI(): Promise<void> {
    await this.setPreferences({ alternative_webui_enabled: false })
  }

  async getTransferInfo(): Promise<TransferInfo> {
    return this.request<TransferInfo>('transfer/info')
  }

  async getMainData(rid: number): Promise<MainDataUpdate> {
    return this.request<MainDataUpdate>(`sync/maindata?rid=${rid}`)
  }

  async getTorrents(filter?: string, category?: string): Promise<Torrent[]> {
    const params = new URLSearchParams()
    if (filter) params.set('filter', filter)
    if (category) params.set('category', category)

    const query = params.toString()
    const url = query ? `torrents/info?${query}` : 'torrents/info'
    return this.request<Torrent[]>(url)
  }

  async getTorrentProperties(hash: string): Promise<Torrent> {
    return this.request<Torrent>(`torrents/properties?hash=${hash}`)
  }

  async getTorrentFiles(hash: string): Promise<TorrentFile[]> {
    return this.request<TorrentFile[]>(`torrents/files?hash=${hash}`)
  }

  async setFilePriority(hash: string, id: string, priority: number): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('hash', hash)
    formData.append('id', id)
    formData.append('priority', priority.toString())

    await this.request('torrents/filePrio', {
      method: 'POST',
      body: formData,
    })
  }

  private async post(endpoint: string, params: Record<string, string>): Promise<void> {
    await this.request(endpoint, { method: 'POST', body: new URLSearchParams(params) })
  }

  async getTorrentPeers(hash: string): Promise<Record<string, TorrentPeer>> {
    const { peers } = await this.request<{ peers?: Record<string, TorrentPeer> }>(`sync/torrentPeers?hash=${hash}&rid=0`)
    return peers ?? {}
  }

  async getCategories(): Promise<Record<string, TorrentCategory>> {
    return this.request('torrents/categories')
  }

  async getTags(): Promise<string[]> {
    return this.request('torrents/tags')
  }

  async recheckTorrents(hashes: string[]): Promise<void> {
    await this.post('torrents/recheck', { hashes: hashes.join('|') })
  }

  async reannounceTorrents(hashes: string[]): Promise<void> {
    await this.post('torrents/reannounce', { hashes: hashes.join('|') })
  }

  // qBittorrent 5.2 rejects this call unless every value is sent, including the action.
  async setShareLimits(hashes: string[], limits: ShareLimits): Promise<void> {
    await this.post('torrents/setShareLimits', {
      hashes: hashes.join('|'),
      ratioLimit: String(limits.ratioLimit),
      seedingTimeLimit: String(limits.seedingTimeLimit),
      inactiveSeedingTimeLimit: String(limits.inactiveSeedingTimeLimit),
      shareLimitAction: limits.shareLimitAction,
    })
  }

  async getPieceStates(hash: string): Promise<number[]> {
    return this.request<number[]>(`torrents/pieceStates?hash=${hash}`)
  }

  async moveInQueue(hashes: string[], direction: QueueMove): Promise<void> {
    await this.post(`torrents/${QUEUE_ENDPOINTS[direction]}`, { hashes: hashes.join('|') })
  }

  async toggleSequentialDownload(hashes: string[]): Promise<void> {
    await this.post('torrents/toggleSequentialDownload', { hashes: hashes.join('|') })
  }

  async toggleFirstLastPiecePrio(hashes: string[]): Promise<void> {
    await this.post('torrents/toggleFirstLastPiecePrio', { hashes: hashes.join('|') })
  }

  async setSuperSeeding(hashes: string[], value: boolean): Promise<void> {
    await this.post('torrents/setSuperSeeding', { hashes: hashes.join('|'), value: String(value) })
  }

  async setAutoManagement(hashes: string[], enable: boolean): Promise<void> {
    await this.post('torrents/setAutoManagement', { hashes: hashes.join('|'), enable: String(enable) })
  }

  async setComment(hashes: string[], comment: string): Promise<void> {
    await this.post('torrents/setComment', { hashes: hashes.join('|'), comment })
  }

  // A blank path stops using a separate folder for incomplete files.
  async setDownloadPath(hashes: string[], path: string): Promise<void> {
    await this.post('torrents/setDownloadPath', { id: hashes.join('|'), path })
  }

  async renameFile(hash: string, oldPath: string, newPath: string): Promise<void> {
    await this.post('torrents/renameFile', { hash, oldPath, newPath })
  }

  async renameFolder(hash: string, oldPath: string, newPath: string): Promise<void> {
    await this.post('torrents/renameFolder', { hash, oldPath, newPath })
  }

  async getWebSeeds(hash: string): Promise<WebSeed[]> {
    return this.request<WebSeed[]>(`torrents/webseeds?hash=${hash}`)
  }

  async addWebSeeds(hash: string, urls: string[]): Promise<void> {
    await this.post('torrents/addWebSeeds', { hash, urls: urls.join('|') })
  }

  async editWebSeed(hash: string, origUrl: string, newUrl: string): Promise<void> {
    await this.post('torrents/editWebSeed', { hash, origUrl, newUrl })
  }

  async removeWebSeeds(hash: string, urls: string[]): Promise<void> {
    await this.post('torrents/removeWebSeeds', { hash, urls: urls.join('|') })
  }

  async createCategory(category: string, savePath: string): Promise<void> {
    await this.post('torrents/createCategory', { category, savePath })
  }

  async editCategory(category: string, savePath: string): Promise<void> {
    await this.post('torrents/editCategory', { category, savePath })
  }

  async removeCategories(categories: string[]): Promise<void> {
    await this.post('torrents/removeCategories', { categories: categories.join('\n') })
  }

  async createTags(tags: string[]): Promise<void> {
    await this.post('torrents/createTags', { tags: tags.join(',') })
  }

  async deleteTags(tags: string[]): Promise<void> {
    await this.post('torrents/deleteTags', { tags: tags.join(',') })
  }

  async setForceStart(hashes: string[], value: boolean): Promise<void> {
    await this.post('torrents/setForceStart', { hashes: hashes.join('|'), value: String(value) })
  }

  async setLocation(hashes: string[], location: string): Promise<void> {
    await this.post('torrents/setLocation', { hashes: hashes.join('|'), location })
  }

  async renameTorrent(hash: string, name: string): Promise<void> {
    await this.post('torrents/rename', { hash, name })
  }

  async setDownloadLimit(hashes: string[], limit: number): Promise<void> {
    await this.post('torrents/setDownloadLimit', { hashes: hashes.join('|'), limit: String(limit) })
  }

  async setUploadLimit(hashes: string[], limit: number): Promise<void> {
    await this.post('torrents/setUploadLimit', { hashes: hashes.join('|'), limit: String(limit) })
  }

  async setCategory(hashes: string[], category: string): Promise<void> {
    await this.post('torrents/setCategory', { hashes: hashes.join('|'), category })
  }

  async addTags(hashes: string[], tags: string[]): Promise<void> {
    await this.post('torrents/addTags', { hashes: hashes.join('|'), tags: tags.join(',') })
  }

  async removeTags(hashes: string[], tags: string[]): Promise<void> {
    await this.post('torrents/removeTags', { hashes: hashes.join('|'), tags: tags.join(',') })
  }

  // `urls` holds one URL per line. A blank line starts a new tier.
  async addTrackers(hash: string, urls: string): Promise<void> {
    await this.post('torrents/addTrackers', { hash, urls })
  }

  // qBittorrent 5.2 names the old URL `url`, and earlier versions name it `origUrl`.
  async editTracker(hash: string, url: string, newUrl: string): Promise<void> {
    await this.post('torrents/editTracker', { hash, url, origUrl: url, newUrl })
  }

  async removeTrackers(hash: string, urls: string[]): Promise<void> {
    await this.post('torrents/removeTrackers', { hash, urls: encodeTrackerUrls(urls) })
  }

  async addPeers(hashes: string[], peers: string[]): Promise<Record<string, { added: number; failed: number }>> {
    return this.request('torrents/addPeers', {
      method: 'POST',
      body: new URLSearchParams({ hashes: hashes.join('|'), peers: peers.join('|') }),
    })
  }

  // Bans apply to every torrent, not only the one the peer came from.
  async banPeers(peers: string[]): Promise<void> {
    await this.post('transfer/banPeers', { peers: peers.join('|') })
  }

  async getTorrentTrackers(hash: string): Promise<TorrentTracker[]> {
    return this.request<TorrentTracker[]>(`torrents/trackers?hash=${hash}`)
  }

  async addTorrentUrl(url: string, options?: { savePath?: string; category?: string; downloader?: string }): Promise<unknown> {
    const params: Record<string, string> = { urls: url }
    if (options?.savePath) params.savepath = options.savePath
    if (options?.category) params.category = options.category
    // A search plugin downloads the .torrent itself, for sites that need its login.
    if (options?.downloader) params.downloader = options.downloader
    return this.addTorrents(params, [])
  }

  // `params` comes from buildAddParams. Files and links can be sent together.
  async addTorrents(params: Record<string, string>, files: File[], filePriorities?: number[]): Promise<unknown> {
    const formData = new FormData()
    for (const [key, value] of Object.entries(params)) formData.append(key, value)
    for (const file of files) formData.append('torrents', file, file.name)
    if (filePriorities?.length) formData.append('filePriorities', filePriorities.join(','))
    return this.request('torrents/add', { method: 'POST', body: formData })
  }

  // Asks qBittorrent for a link's file list. It answers with only the hash until it has it.
  async fetchMetadata(source: string): Promise<unknown> {
    return this.request('torrents/fetchMetadata', { method: 'POST', body: new URLSearchParams({ source }) })
  }

  async deleteTorrents(hashes: string[], deleteFiles: boolean = false): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('hashes', hashes.join('|'))
    formData.append('deleteFiles', deleteFiles.toString())

    await this.request('torrents/delete', {
      method: 'POST',
      body: formData,
    })
  }

  async pauseTorrents(hashes: string[]): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('hashes', hashes.join('|'))

    await this.request('torrents/stop', {
      method: 'POST',
      body: formData,
    })
  }

  async resumeTorrents(hashes: string[]): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('hashes', hashes.join('|'))

    await this.request('torrents/start', {
      method: 'POST',
      body: formData,
    })
  }

  async getRSSFeeds(): Promise<{ feeds: RSSFeed[]; folders: string[] }> {
    const tree = await this.request<RawRSSTree>('rss/items?withData=true')
    return { feeds: flattenRSSTree(tree).map(({ feed }) => feed), folders: listRSSFolders(tree) }
  }

  async getRSSItems(feedUid: string): Promise<{ articles: RSSItem[] }> {
    const tree = await this.request<RawRSSTree>('rss/items?withData=true')
    return { articles: flattenRSSTree(tree).find(({ feed }) => feed.uid === feedUid)?.articles ?? [] }
  }

  // `folder` uses qBittorrent's backslash-separated paths. The feed is named after its URL.
  async addRSSFeed(url: string, folder = ''): Promise<void> {
    const name = url.replaceAll('\\', '/')
    await this.post('rss/addFeed', { url, path: folder ? `${folder}\\${name}` : name })
  }

  async addRSSFolder(path: string): Promise<void> {
    await this.post('rss/addFolder', { path })
  }

  // Moving an item within its folder renames it.
  async moveRSSItem(itemPath: string, destPath: string): Promise<void> {
    await this.post('rss/moveItem', { itemPath, destPath })
  }

  async refreshRSSItem(itemPath: string): Promise<void> {
    await this.post('rss/refreshItem', { itemPath })
  }

  async setRSSFeedURL(path: string, url: string): Promise<void> {
    await this.post('rss/setFeedURL', { path, url })
  }

  // 0 uses qBittorrent's global refresh interval.
  async setRSSFeedRefreshInterval(path: string, seconds: number): Promise<void> {
    await this.post('rss/setFeedRefreshInterval', { path, refreshInterval: String(seconds) })
  }

  async renameRSSRule(ruleName: string, newRuleName: string): Promise<void> {
    await this.post('rss/renameRule', { ruleName, newRuleName })
  }

  // Article titles each feed would download, keyed by feed name.
  async getRSSMatchingArticles(ruleName: string): Promise<Record<string, string[]>> {
    return this.request(`rss/matchingArticles?ruleName=${encodeURIComponent(ruleName)}`)
  }

  async getSearchStatus(): Promise<{ id: number; status: string; total: number }[]> {
    return this.request('search/status')
  }

  async deleteSearch(id: number): Promise<void> {
    await this.post('search/delete', { id: String(id) })
  }

  // Lets the plugin fetch the .torrent itself, for sites that need its login.
  async downloadSearchTorrent(torrentUrl: string, pluginName: string): Promise<void> {
    await this.post('search/downloadTorrent', { torrentUrl, pluginName })
  }

  async removeRSSFeed(path: string): Promise<void> {
    await this.post('rss/removeItem', { path })
  }

  // Marks one article, or the whole feed or folder without an article id.
  async markAsRead(itemPath: string, articleId?: string): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('itemPath', itemPath)
    if (articleId) formData.append('articleId', articleId)

    await this.request('rss/markAsRead', {
      method: 'POST',
      body: formData,
    })
  }

  async getRSSRules(): Promise<Record<string, RSSRule>> {
    return this.request('rss/rules')
  }

  async setRSSRule(name: string, rule: RSSRule): Promise<void> {
    await this.post('rss/setRule', { ruleName: name, ruleDef: JSON.stringify(rule) })
  }

  async removeRSSRule(name: string): Promise<void> {
    await this.post('rss/removeRule', { ruleName: name })
  }

  async searchPlugins(): Promise<{ name: string; fullName?: string; version: string; enabled: boolean }[]> {
    return this.request('search/plugins')
  }

  async installSearchPlugin(sources: string[]): Promise<void> {
    await this.post('search/installPlugin', { sources: sources.join('|') })
  }

  async uninstallSearchPlugin(names: string[]): Promise<void> {
    await this.post('search/uninstallPlugin', { names: names.join('|') })
  }

  async enableSearchPlugin(names: string[], enable: boolean): Promise<void> {
    await this.post('search/enablePlugin', { names: names.join('|'), enable: String(enable) })
  }

  async updateSearchPlugins(): Promise<void> {
    await this.post('search/updatePlugins', {})
  }

  async startSearch(pattern: string, plugins = 'enabled', category = 'all'): Promise<{ id: number }> {
    const body = `pattern=${encodeURIComponent(pattern).replace(/%20/g, '+')}&plugins=${encodeURIComponent(plugins)}&category=${encodeURIComponent(category)}`

    return this.request('search/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
  }

  async stopSearch(id: number): Promise<void> {
    const body = `id=${id}`
    await this.request('search/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
  }

  async getSearchResults(id: number): Promise<{ results: SearchResult[]; status: string }> {
    return this.request(`search/results?id=${id}`)
  }

  /** Warnings logged after the given log entry id (-1 for all of them). */
  async getLogWarnings(lastKnownId: number = -1): Promise<LogEntry[]> {
    return this.request(`log/main?normal=false&info=false&warning=true&critical=false&last_known_id=${lastKnownId}`)
  }

  async getLogs(levels: { normal: boolean; info: boolean; warning: boolean; critical: boolean }): Promise<LogEntry[]> {
    const params = new URLSearchParams({
      normal: String(levels.normal),
      info: String(levels.info),
      warning: String(levels.warning),
      critical: String(levels.critical),
      last_known_id: '-1',
    })
    return this.request(`log/main?${params}`)
  }

  async getPeerLog(): Promise<PeerLogEntry[]> {
    return this.request('log/peers?last_known_id=-1')
  }
}

export const qbitClient = import.meta.env.VITE_DEMO_MODE ? demoClient : new QBittorrentClient()
