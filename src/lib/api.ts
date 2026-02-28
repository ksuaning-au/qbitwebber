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
  TransferInfo
} from '@/types'

const DEFAULT_USER = localStorage.getItem('qbit_user') || 'admin'

class QBittorrentClient {
  private username: string
  private password: string
  private sid: string | null = null

  constructor(username?: string, password?: string) {
    this.username = username || DEFAULT_USER
    this.password = password || ''
  }

  setCredentials(_host: string, username: string, password: string) {
    this.username = username
    this.password = password
    localStorage.setItem('qbit_user', username)
    this.sid = null
  }

  getHost() {
    return 'http://192.168.15.19:8000'
  }

  getUsername() {
    return this.username
  }

  isConfigured(): boolean {
    return !!this.username && !!this.password
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint
    
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }

    if (this.sid) {
      headers['Cookie'] = `SID=${this.sid}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    const responseText = await response.text()
    console.log('API Response:', response.status, responseText)

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
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

  async login(): Promise<boolean> {
    const formData = new URLSearchParams()
    formData.append('username', this.username)
    formData.append('password', this.password)

    const response = await fetch(`/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Referer': 'http://192.168.15.19:8080',
      },
      body: formData,
    })

    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      const match = setCookie.match(/SID=([^;]+)/)
      if (match) {
        this.sid = match[1]
        return true
      }
    }

    return response.ok
  }

  async logout(): Promise<void> {
    await this.request('/api/v2/auth/logout')
    this.sid = null
  }

  async getAppVersion(): Promise<string> {
    return this.request<string>('/api/v2/app/version')
  }

  async getAppConfig(): Promise<AppConfig> {
    return this.request<AppConfig>('/api/v2/app/config')
  }

  async getTransferInfo(): Promise<TransferInfo> {
    return this.request<TransferInfo>('/api/v2/transfer/info')
  }

  async getTorrents(filter?: string, category?: string): Promise<Torrent[]> {
    const params = new URLSearchParams()
    if (filter) params.set('filter', filter)
    if (category) params.set('category', category)
    
    const query = params.toString()
    const url = query ? `/api/v2/torrents/info?${query}` : '/api/v2/torrents/info'
    return this.request<Torrent[]>(url)
  }

  async getTorrentProperties(hash: string): Promise<Torrent> {
    return this.request<Torrent>(`/api/v2/torrents/properties?hash=${hash}`)
  }

  async getTorrentFiles(hash: string): Promise<TorrentFile[]> {
    return this.request<TorrentFile[]>(`/api/v2/torrents/files?hash=${hash}`)
  }

  async setFilePriority(hash: string, id: string, priority: number): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('hash', hash)
    formData.append('id', id)
    formData.append('priority', priority.toString())

    await this.request('/api/v2/torrents/filePrio', {
      method: 'POST',
      body: formData,
    })
  }

  async getTorrentTrackers(hash: string): Promise<TorrentTracker[]> {
    return this.request<TorrentTracker[]>(`/api/v2/torrents/trackers?hash=${hash}`)
  }

  async addTorrentUrl(url: string, options?: { savePath?: string; category?: string }): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('urls', url)
    if (options?.savePath) formData.append('savepath', options.savePath)
    if (options?.category) formData.append('category', options.category)

    await this.request('/api/v2/torrents/add', {
      method: 'POST',
      body: formData,
    })
  }

  async addTorrentFile(file: File, options?: { savePath?: string; category?: string }): Promise<void> {
    const formData = new FormData()
    formData.append('torrents', file)
    if (options?.savePath) formData.append('savepath', options.savePath)
    if (options?.category) formData.append('category', options.category)

    await this.request('/api/v2/torrents/add', {
      method: 'POST',
      body: formData,
    })
  }

  async deleteTorrents(hashes: string[], deleteFiles: boolean = false): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('hashes', hashes.join('|'))
    formData.append('deleteFiles', deleteFiles.toString())

    await this.request('/api/v2/torrents/delete', {
      method: 'POST',
      body: formData,
    })
  }

  async pauseTorrents(hashes: string[]): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('hashes', hashes.join('|'))

    await this.request('/api/v2/torrents/pause', {
      method: 'POST',
      body: formData,
    })
  }

  async resumeTorrents(hashes: string[]): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('hashes', hashes.join('|'))

    await this.request('/api/v2/torrents/resume', {
      method: 'POST',
      body: formData,
    })
  }

  async getRSSFeeds(): Promise<{ feeds: RSSFeed[] }> {
    return this.request('/api/v2/rss/feeds')
  }

  async getRSSItems(feedUid: string): Promise<{ articles: RSSItem[] }> {
    return this.request(`/api/v2/rss/items?uid=${feedUid}`)
  }

  async addRSSFeed(url: string): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('url', url)

    await this.request('/api/v2/rss/addFeed', {
      method: 'POST',
      body: formData,
    })
  }

  async removeRSSFeed(uid: string): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('uid', uid)

    await this.request('/api/v2/rss/removeFeed', {
      method: 'POST',
      body: formData,
    })
  }

  async markAsRead(uid: string, articleId?: string): Promise<void> {
    const formData = new URLSearchParams()
    formData.append('uid', uid)
    if (articleId) formData.append('articleId', articleId)

    await this.request('/api/v2/rss/markAsRead', {
      method: 'POST',
      body: formData,
    })
  }

  async getRSSRules(): Promise<{ rules: RSSRule[] }> {
    return this.request('/api/v2/rss/rules')
  }

  async searchPlugins(): Promise<{ plugins: { name: string; version: string; enabled: boolean }[] }> {
    return this.request('/api/v2/search/plugins')
  }

  async startSearch(pattern: string): Promise<{ id: number }> {
    const body = `pattern=${encodeURIComponent(pattern).replace(/%20/g, '+')}&plugins=all&category=all`

    return this.request('/api/v2/search/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
  }

  async stopSearch(id: number): Promise<void> {
    const body = `id=${id}`
    await this.request('/api/v2/search/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })
  }

  async getSearchResults(id: number): Promise<{ results: SearchResult[]; status: string }> {
    return this.request(`/api/v2/search/results?id=${id}`)
  }

  async getLogs(normal: boolean = true, lastId: number = -1): Promise<LogEntry[]> {
    return this.request(`/api/v2/log/main?normal=${normal}&lastId=${lastId}`)
  }
}

export const qbitClient = new QBittorrentClient()
