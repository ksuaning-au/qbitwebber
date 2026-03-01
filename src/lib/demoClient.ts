import type {
  Torrent,
  TorrentFile,
  TorrentTracker,
  RSSFeed,
  RSSItem,
  SearchResult,
  LogEntry,
  TransferInfo,
} from '@/types'

class DemoQBittorrentClient {
  private isLoggedIn = false
  private username = ''

  setCredentials(username: string, password: string) {
    this.username = username
    localStorage.setItem('qbit_user', username)
  }

  getUsername() {
    return this.username
  }

  isConfigured(): boolean {
    return true
  }

  async login(): Promise<boolean> {
    this.isLoggedIn = true
    return true
  }

  async logout(): Promise<void> {
    this.isLoggedIn = false
  }

  async getAppVersion(): Promise<string> {
    return 'v5.0.1'
  }

  async getAppConfig(): Promise<{ webuiPort: number; locale: string }> {
    return { webuiPort: 8080, locale: 'en' }
  }

  async getPreferences(): Promise<Record<string, unknown>> {
    return { locale: 'en' }
  }

  async setPreferences(_prefs: Record<string, unknown>): Promise<void> {
  }

  async getTransferInfo(): Promise<TransferInfo> {
    return {
      connection_status: 'connected',
      dht_nodes: 42,
      dl_info_data: 156_789_012_345,
      dl_info_speed: 2_345_678,
      dl_rate_limit: 0,
      up_info_data: 89_012_345_678,
      up_info_speed: 567_890,
      up_rate_limit: 0,
    }
  }

  async getTorrents(_filter?: string, _category?: string): Promise<Torrent[]> {
    const now = Math.floor(Date.now() / 1000)
    return [
      {
        added_on: now - 86400 * 3,
        amount_left: 0,
        auto_tmm: true,
        category: 'Movies',
        completed: 100,
        completion_on: now - 86400,
        content_path: '/downloads/ubuntu-24.04-desktop-amd64.iso',
        dl_limit: 0,
        dlspeed: 0,
        dl_speed_avg: 5_000_000,
        download_path: '',
        eta: 0,
        f_l_piece_prio: false,
        force_start: false,
        hash: 'abc123def456789',
        inactive_seeding_time_limit: -1,
        index: 0,
        last_activity: now - 3600,
        magnet_uri: 'magnet:?xt=urn:btih:abc123def456789',
        max_inactive_seeding_time: -1,
        max_ratio: 1.0,
        max_seeding_time: -1,
        name: 'ubuntu-24.04-desktop-amd64.iso',
        num_complete: 150,
        num_incomplete: 10,
        num_leechs: 5,
        num_seeds: 150,
        priority: 1,
        progress: 1,
        ratio: 1.05,
        ratio_limit: 1.0,
        save_path: '/downloads',
        seeding_time: 86400,
        seeding_time_limit: -1,
        seen_complete: 1,
        size: 5_500_000_000,
        state: 'uploading',
        state_enum: 'uploading',
        tags: '',
        time_active: 172800,
        total_downloaded: 5_500_000_000,
        total_uploaded: 5_775_000_000,
        total_size: 5_500_000_000,
        tracker: 'https://ubuntu.com/bt',
        trackers_count: 1,
        up_limit: 0,
        upspeed: 567_890,
        up_speed_avg: 560_000,
        uploaded: 5_775_000_000,
        uploaded_session: 567_890,
        upspeed_avg: 560_000,
      },
      {
        added_on: now - 86400,
        amount_left: 2_500_000_000,
        auto_tmm: false,
        category: 'TV Shows',
        completed: 50,
        completion_on: 0,
        content_path: '',
        dl_limit: 0,
        dlspeed: 2_345_678,
        dl_speed_avg: 3_000_000,
        download_path: '',
        eta: 1200,
        f_l_piece_prio: false,
        force_start: false,
        hash: 'def456abc789012',
        inactive_seeding_time_limit: -1,
        index: 1,
        last_activity: now - 60,
        magnet_uri: 'magnet:?xt=urn:btih:def456abc789012',
        max_inactive_seeding_time: -1,
        max_ratio: -1,
        max_seeding_time: -1,
        name: 'breaking-bad-s01e01-720p.mkv',
        num_complete: 25,
        num_incomplete: 50,
        num_leechs: 30,
        num_seeds: 25,
        priority: 1,
        progress: 0.5,
        ratio: 0.1,
        ratio_limit: -1,
        save_path: '/downloads/tv',
        seeding_time: 0,
        seeding_time_limit: -1,
        seen_complete: 0,
        size: 5_000_000_000,
        state: 'downloading',
        state_enum: 'downloading',
        tags: '',
        time_active: 3600,
        total_downloaded: 2_500_000_000,
        total_uploaded: 250_000_000,
        total_size: 5_000_000_000,
        tracker: 'https://example.com/tracker',
        trackers_count: 1,
        up_limit: 0,
        upspeed: 250_000,
        up_speed_avg: 200_000,
        uploaded: 250_000_000,
        uploaded_session: 250_000_000,
        upspeed_avg: 200_000,
      },
      {
        added_on: now - 86400 * 7,
        amount_left: 0,
        auto_tmm: true,
        category: 'Software',
        completed: 100,
        completion_on: now - 86400 * 6,
        content_path: '/downloads/vscode-linux-x64.tar.gz',
        dl_limit: 0,
        dlspeed: 0,
        dl_speed_avg: 8_000_000,
        download_path: '',
        eta: 0,
        f_l_piece_prio: false,
        force_start: false,
        hash: 'ghi789jkl012345',
        inactive_seeding_time_limit: -1,
        index: 2,
        last_activity: now - 7200,
        magnet_uri: 'magnet:?xt=urn:btih:ghi789jkl012345',
        max_inactive_seeding_time: -1,
        max_ratio: 2.0,
        max_seeding_time: -1,
        name: 'vscode-linux-x64.tar.gz',
        num_complete: 80,
        num_incomplete: 5,
        num_leechs: 3,
        num_seeds: 80,
        priority: 1,
        progress: 1,
        ratio: 0.5,
        ratio_limit: 2.0,
        save_path: '/downloads',
        seeding_time: 518400,
        seeding_time_limit: -1,
        seen_complete: 1,
        size: 350_000_000,
        state: 'pausedUP',
        state_enum: 'pausedUP',
        tags: 'paused',
        time_active: 604800,
        total_downloaded: 350_000_000,
        total_uploaded: 175_000_000,
        total_size: 350_000_000,
        tracker: 'https://example.com/tracker2',
        trackers_count: 1,
        up_limit: 0,
        upspeed: 0,
        up_speed_avg: 50_000,
        uploaded: 175_000_000,
        uploaded_session: 0,
        upspeed_avg: 50_000,
      },
      {
        added_on: now - 86400 * 2,
        amount_left: 800_000_000,
        auto_tmm: false,
        category: 'Music',
        completed: 20,
        completion_on: 0,
        content_path: '',
        dl_limit: 0,
        dlspeed: 1_500_000,
        dl_speed_avg: 2_000_000,
        download_path: '',
        eta: 600,
        f_l_piece_prio: false,
        force_start: false,
        hash: 'mno012pqr678901',
        inactive_seeding_time_limit: -1,
        index: 3,
        last_activity: now - 30,
        magnet_uri: 'magnet:?xt=urn:btih:mno012pqr678901',
        max_inactive_seeding_time: -1,
        max_ratio: -1,
        max_seeding_time: -1,
        name: 'album-flac打包.zip',
        num_complete: 15,
        num_incomplete: 20,
        num_leechs: 10,
        num_seeds: 15,
        priority: 1,
        progress: 0.2,
        ratio: 0,
        ratio_limit: -1,
        save_path: '/downloads/music',
        seeding_time: 0,
        seeding_time_limit: -1,
        seen_complete: 0,
        size: 1_000_000_000,
        state: 'downloading',
        state_enum: 'downloading',
        tags: '',
        time_active: 1800,
        total_downloaded: 200_000_000,
        total_uploaded: 0,
        total_size: 1_000_000_000,
        tracker: 'https://example.com/tracker3',
        trackers_count: 2,
        up_limit: 0,
        upspeed: 0,
        up_speed_avg: 0,
        uploaded: 0,
        uploaded_session: 0,
        upspeed_avg: 0,
      },
      {
        added_on: now - 86400 * 5,
        amount_left: 0,
        auto_tmm: true,
        category: '',
        completed: 100,
        completion_on: now - 86400 * 4,
        content_path: '/downloads/arch-linux.iso',
        dl_limit: 0,
        dlspeed: 0,
        dl_speed_avg: 10_000_000,
        download_path: '',
        eta: 0,
        f_l_piece_prio: false,
        force_start: false,
        hash: 'stu345vwx678901',
        inactive_seeding_time_limit: -1,
        index: 4,
        last_activity: now - 86400,
        magnet_uri: 'magnet:?xt=urn:btih:stu345vwx678901',
        max_inactive_seeding_time: -1,
        max_ratio: 0.5,
        max_seeding_time: 604800,
        name: 'arch-linux-2024.01.01-x86_64.iso',
        num_complete: 200,
        num_incomplete: 0,
        num_leechs: 0,
        num_seeds: 200,
        priority: 1,
        progress: 1,
        ratio: 0.5,
        ratio_limit: 0.5,
        save_path: '/downloads',
        seeding_time: 345600,
        seeding_time_limit: 604800,
        seen_complete: 1,
        size: 850_000_000,
        state: 'stalledUP',
        state_enum: 'stalledUP',
        tags: '',
        time_active: 432000,
        total_downloaded: 850_000_000,
        total_uploaded: 425_000_000,
        total_size: 850_000_000,
        tracker: 'https://archlinux.org',
        trackers_count: 1,
        up_limit: 0,
        upspeed: 0,
        up_speed_avg: 100_000,
        uploaded: 425_000_000,
        uploaded_session: 0,
        upspeed_avg: 100_000,
      },
    ]
  }

  async getTorrentProperties(_hash: string): Promise<Torrent> {
    const torrents = await this.getTorrents()
    return torrents[0]
  }

  async getTorrentFiles(_hash: string): Promise<TorrentFile[]> {
    return [
      { index: 0, name: 'video.mp4', size: 5_000_000_000, progress: 1, priority: 7, is_seed: true, piece_range: [0, 5000] },
      { index: 1, name: 'subtitle.srt', size: 5_000, progress: 1, priority: 1, is_seed: true, piece_range: [5001, 5002] },
      { index: 2, name: 'cover.jpg', size: 500_000, progress: 1, priority: 1, is_seed: true, piece_range: [5003, 5010] },
      { index: 3, name: 'bonus/extra.mkv', size: 1_500_000_000, progress: 0.5, priority: 2, is_seed: false, piece_range: [5011, 6500] },
    ]
  }

  async setFilePriority(_hash: string, _id: string, _priority: number): Promise<void> {
  }

  async getTorrentTrackers(_hash: string): Promise<TorrentTracker[]> {
    return [
      { url: 'https://example.com/tracker', status: 2, tier: 0, num_peers: 50, num_seeds: 100, num_leechers: 25, num_downloaded: 1000, last_error: '', msg: 'OK' },
      { url: 'https://backup.com/tracker', status: 4, tier: 1, num_peers: 0, num_seeds: 0, num_leechers: 0, num_downloaded: 0, last_error: 'Connection timed out', msg: '' },
    ]
  }

  async addTorrentUrl(_url: string, _options?: { savePath?: string; category?: string }): Promise<void> {
  }

  async addTorrentFile(_file: File, _options?: { savePath?: string; category?: string }): Promise<void> {
  }

  async deleteTorrents(_hashes: string[], _deleteFiles: boolean = false): Promise<void> {
  }

  async pauseTorrents(_hashes: string[]): Promise<void> {
  }

  async resumeTorrents(_hashes: string[]): Promise<void> {
  }

  async getRSSFeeds(): Promise<{ feeds: RSSFeed[] }> {
    return {
      feeds: [
        { uid: 'feed1', url: 'https://example.com/rss/movies', title: 'Movie Releases', unreadCount: 3, hasError: false },
        { uid: 'feed2', url: 'https://example.com/rss/tv', title: 'TV Shows', unreadCount: 5, hasError: false },
        { uid: 'feed3', url: 'https://example.com/rss/software', title: 'Software Updates', unreadCount: 1, hasError: false },
      ],
    }
  }

  async getRSSItems(_feedUid: string): Promise<{ articles: RSSItem[] }> {
    return {
      articles: [
        { id: '1', feedUID: 'feed1', title: 'Dune Part Two 2024 1080p', url: 'https://example.com/movie1', author: 'anon', date: '2024-01-15', description: 'Some movie description', isRead: false },
        { id: '2', feedUID: 'feed1', title: 'Oppenheimer 2023 2160p', url: 'https://example.com/movie2', author: 'anon', date: '2024-01-14', description: 'Another movie', isRead: false },
        { id: '3', feedUID: 'feed1', title: 'Past Lives 2023 720p', url: 'https://example.com/movie3', author: 'anon', date: '2024-01-13', description: 'Indie film', isRead: true },
      ],
    }
  }

  async addRSSFeed(_url: string): Promise<void> {
  }

  async removeRSSFeed(_uid: string): Promise<void> {
  }

  async markAsRead(_uid: string, _articleId?: string): Promise<void> {
  }

  async getRSSRules(): Promise<{ rules: never[] }> {
    return { rules: [] }
  }

  async searchPlugins(): Promise<{ plugins: { name: string; version: string; enabled: boolean }[] }> {
    return {
      plugins: [
        { name: 'Rarbg', version: '1.0', enabled: true },
        { name: 'The Pirate Bay', version: '2.1', enabled: true },
        { name: '1337x', version: '1.5', enabled: false },
      ],
    }
  }

  async startSearch(_pattern: string): Promise<{ id: number }> {
    return { id: 12345 }
  }

  async stopSearch(_id: number): Promise<void> {
  }

  async getSearchResults(_id: number): Promise<{ results: SearchResult[]; status: string }> {
    return {
      results: [
        { descrLink: 'https://example.com/1', fileName: 'ubuntu-24.04-desktop-amd64.iso', fileSize: 5_500_000_000, fileUrl: 'magnet:1', nbLeechers: 100, nbSeeders: 500, siteUrl: 'https://example.com' },
        { descrLink: 'https://example.com/2', fileName: 'fedora-40-workstation.iso', fileSize: 2_200_000_000, fileUrl: 'magnet:2', nbLeechers: 50, nbSeeders: 200, siteUrl: 'https://example.com' },
      ],
      status: 'Stopped',
    }
  }

  async getLogs(_normal: boolean = true, _lastId: number = -1): Promise<LogEntry[]> {
    const now = Math.floor(Date.now() / 1000)
    return [
      { id: 1, timestamp: now - 60, type: 'INFO', message: 'qBittorrent v5.0.1 started' },
      { id: 2, timestamp: now - 120, type: 'INFO', message: 'Listening on IP: 0.0.0.0:8080' },
      { id: 3, timestamp: now - 180, type: 'WARNING', message: 'Tracker "https://bad-tracker.com" failed: Connection timed out' },
      { id: 4, timestamp: now - 240, type: 'INFO', message: 'Downloaded ubuntu-24.04-desktop-amd64.iso (100%)' },
      { id: 5, timestamp: now - 300, type: 'INFO', message: 'Torrent category "Movies" created' },
    ]
  }
}

export const demoClient = new DemoQBittorrentClient()
