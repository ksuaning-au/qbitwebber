import type {
  AppConfig,
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
  TorrentPeer
} from '@/types'

import { demoClient } from './demoClient'
import { flattenRSSTree, type RawRSSTree } from './rss'

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

  async getAppConfig(): Promise<AppConfig> {
    return this.request<AppConfig>('app/config')
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

  async revertToDefaultWebUI(): Promise<void> {
    await this.setPreferences({ alternative_webui_enabled: false })
  }

  async getTransferInfo(): Promise<TransferInfo> {
    return this.request<TransferInfo>('transfer/info')
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

  async getTorrentTrackers(hash: string): Promise<TorrentTracker[]> {
    return this.request<TorrentTracker[]>(`torrents/trackers?hash=${hash}`)
  }

  async addTorrentUrl(url: string, options?: { savePath?: string; category?: string }): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('urls', url)
    if (options?.savePath) formData.append('savepath', options.savePath)
    if (options?.category) formData.append('category', options.category)

    await this.request('torrents/add', {
      method: 'POST',
      body: formData,
    })
  }

  async addTorrentFile(file: File, options?: { savePath?: string; category?: string }): Promise<void> {
    const formData = new FormData()
    formData.append('torrents', file)
    if (options?.savePath) formData.append('savepath', options.savePath)
    if (options?.category) formData.append('category', options.category)

    await this.request('torrents/add', {
      method: 'POST',
      body: formData,
    })
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

  async getRSSFeeds(): Promise<{ feeds: RSSFeed[] }> {
    const tree = await this.request<RawRSSTree>('rss/items?withData=true')
    return { feeds: flattenRSSTree(tree).map(({ feed }) => feed) }
  }

  async getRSSItems(feedUid: string): Promise<{ articles: RSSItem[] }> {
    const tree = await this.request<RawRSSTree>('rss/items?withData=true')
    return { articles: flattenRSSTree(tree).find(({ feed }) => feed.uid === feedUid)?.articles ?? [] }
  }

  async addRSSFeed(url: string): Promise<void> {
    // The path is the feed's name in qBittorrent, where a backslash would mean a folder.
    await this.post('rss/addFeed', { url, path: url.replaceAll('\\', '/') })
  }

  async removeRSSFeed(path: string): Promise<void> {
    await this.post('rss/removeItem', { path })
  }

  async markAsRead(uid: string, articleId?: string): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('uid', uid)
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

  async getLogs(normal: boolean = true, lastId: number = -1): Promise<LogEntry[]> {
    return this.request(`log/main?normal=${normal}&lastId=${lastId}`)
  }
}

export const qbitClient = import.meta.env.VITE_DEMO_MODE ? demoClient : new QBittorrentClient()
