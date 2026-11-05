import type { Torrent } from '@/types'

export type StatusFilter = 'all' | 'downloading' | 'seeding' | 'completed' | 'stopped' | 'active' | 'errored'

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'downloading', label: 'Downloading' },
  { value: 'seeding', label: 'Seeding' },
  { value: 'completed', label: 'Completed' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'active', label: 'Active' },
  { value: 'errored', label: 'Errored' },
]

export interface TorrentFilters {
  name: string
  status: StatusFilter
  // Empty means any category or tag.
  category: string
  tag: string
}

const isStopped = (state: string) => state.startsWith('paused') || state.startsWith('stopped')

function matchesStatus(torrent: Torrent, status: StatusFilter): boolean {
  const state: string = torrent.state
  switch (status) {
    case 'all':
      return true
    case 'downloading':
      return ['downloading', 'forcedDL', 'metaDL', 'forcedMetaDL', 'stalledDL', 'queuedDL', 'allocating'].includes(state)
    case 'seeding':
      return ['uploading', 'forcedUP', 'stalledUP', 'queuedUP'].includes(state)
    case 'completed':
      return torrent.progress >= 1
    case 'stopped':
      return isStopped(state)
    case 'active':
      return torrent.dlspeed > 0 || torrent.upspeed > 0
    case 'errored':
      return state === 'error' || state === 'missingFiles'
  }
}

export function parseTags(tags: string | undefined): string[] {
  return (tags ?? '').split(',').map(tag => tag.trim()).filter(Boolean)
}

export function filterTorrents(torrents: Torrent[], filters: TorrentFilters): Torrent[] {
  const name = filters.name.trim().toLowerCase()
  return torrents.filter(torrent =>
    (!name || torrent.name.toLowerCase().includes(name)) &&
    matchesStatus(torrent, filters.status) &&
    (!filters.category || torrent.category === filters.category) &&
    (!filters.tag || parseTags(torrent.tags).includes(filters.tag))
  )
}
