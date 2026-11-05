import type { Torrent } from '@/types'

// The parts of sync/maindata's server_state the app shows. qBittorrent may add more.
export interface ServerState {
  // 'connected', 'firewalled', or 'disconnected'.
  connection_status?: string
  dht_nodes?: number
  dl_info_speed?: number
  up_info_speed?: number
  dl_info_data?: number
  up_info_data?: number
  dl_rate_limit?: number
  up_rate_limit?: number
  free_space_on_disk?: number
  alltime_dl?: number
  alltime_ul?: number
  global_ratio?: string
  total_wasted_session?: number
  total_peer_connections?: number
  read_cache_hits?: string
  read_cache_overload?: string
  write_cache_overload?: string
  total_buffers_size?: number
  queued_io_jobs?: number
  average_time_queue?: number
  total_queued_size?: number
  queueing?: boolean
  [key: string]: unknown
}

export interface MainData {
  rid: number
  torrents: Record<string, Torrent>
  serverState: ServerState
}

export interface MainDataUpdate {
  rid?: number
  full_update?: boolean
  torrents?: Record<string, Partial<Torrent>>
  torrents_removed?: string[]
  server_state?: Partial<ServerState>
}

// qBittorrent sends everything once, then only the fields that changed since `rid`.
export function applyMainDataUpdate(previous: MainData | null, update: MainDataUpdate): MainData {
  const full = update.full_update || !previous
  const torrents: Record<string, Torrent> = full ? {} : { ...previous.torrents }

  for (const [hash, changes] of Object.entries(update.torrents ?? {})) {
    torrents[hash] = { ...(full ? {} : torrents[hash]), ...changes, hash } as Torrent
  }
  for (const hash of update.torrents_removed ?? []) delete torrents[hash]

  return {
    rid: update.rid ?? previous?.rid ?? 0,
    torrents,
    serverState: { ...(full ? {} : previous.serverState), ...update.server_state },
  }
}
