export interface AppConfig {
  webuiPort: number
  webuiPortForwarded: boolean
  locale: string
  authDomain: string
  serverState: string
  browseLicense: boolean
  donateLevel: number
  updateToMajor: boolean
}

export interface Torrent {
  added_on: number
  amount_left: number
  auto_tmm: boolean
  category: string
  completed: number
  completion_on: number
  content_path: string
  dl_limit: number
  dlspeed: number
  dl_speed_avg: number
  download_path: string
  eta: number
  f_l_piece_prio: boolean
  force_start: boolean
  hash: string
  inactive_seeding_time_limit: number
  index: number
  last_activity: number
  magnet_uri: string
  max_inactive_seeding_time: number
  max_ratio: number
  max_seeding_time: number
  name: string
  num_complete: number
  num_incomplete: number
  num_leechs: number
  num_seeds: number
  priority: number
  progress: number
  ratio: number
  ratio_limit: number
  save_path: string
  seeding_time: number
  seeding_time_limit: number
  seen_complete: number
  size: number
  state: TorrentState
  state_enum: string
  tags: string
  time_active: number
  total_downloaded: number
  total_uploaded: number
  total_size: number
  tracker: string
  trackers_count: number
  up_limit: number
  upspeed: number
  up_speed_avg: number
  uploaded: number
  uploaded_session: number
  upspeed_avg: number
}

export type TorrentState = 
  | 'error'
  | 'missingFiles'
  | 'uploading'
  | 'pausedUP'
  | 'queuedUP'
  | 'stalledUP'
  | 'checkingUP'
  | 'forcedUP'
  | 'downloading'
  | 'missingFiles'
  | 'pausedDL'
  | 'queuedDL'
  | 'stalledDL'
  | 'checkingDL'
  | 'forcedDL'
  | 'metaDL'
  | 'forcedMetaDL'
  | 'allocating'
  | 'checkingResumeData'
  | 'moving'

export interface TorrentFile {
  index: number
  name: string
  size: number
  progress: number
  priority: FilePriority
  is_seed: boolean
  piece_range: [number, number]
}

export type FilePriority = 0 | 1 | 2 | 7

export interface TorrentTracker {
  url: string
  status: TrackerStatus
  tier: number
  num_peers: number
  num_seeds: number
  num_leechers: number
  num_downloaded: number
  last_error: string
  msg: string
}

export type TrackerStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface RSSFeed {
  uid: string
  url: string
  title: string
  unreadCount: number
  hasError: boolean
  lastBuildDate?: string
}

export interface RSSItem {
  id: string
  feedUID: string
  title: string
  url: string
  author?: string
  date?: string
  description?: string
  isRead: boolean
}

export interface RSSRule {
  enabled: boolean
  mustContain: string
  mustNotContain: string
  useRegex: boolean
  caseSensitive: boolean
  addToCategory: string
  savePath?: string
}

export interface SearchResult {
  descrLink: string
  fileName: string
  fileSize: number
  fileUrl: string
  nbLeechers: number
  nbSeeders: number
  siteUrl: string
}

export type SearchStatus = 'Running' | 'Stopped' | 'Paused' | 'Completed' | 'Error'

export interface LogEntry {
  id: number
  timestamp: number
  type: LogType
  message: string
}

export type LogType = 'INFO' | 'WARNING' | 'CRITICAL' | 'DEBUG' | 'ERROR'

export interface TransferInfo {
  connection_status: string
  dht_nodes: number
  dl_info_data: number
  dl_info_speed: number
  dl_rate_limit: number
  up_info_data: number
  up_info_speed: number
  up_rate_limit: number
}
