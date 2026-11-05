import { describe, expect, it } from 'vitest'
import { filterTorrents, parseTags, type TorrentFilters, getTrackerHost, groupTrackersByHost, matchesTracker, TRACKERLESS } from './torrentFilters'
import type { Torrent } from '@/types'

const torrent = (over: Partial<Torrent>) => ({ name: 'Ubuntu', state: 'downloading', progress: 0.5, dlspeed: 0, upspeed: 0, category: '', tags: '', ...over }) as Torrent
const none: TorrentFilters = { name: '', status: 'all', category: '', tag: '' }
const names = (list: Torrent[], filters: Partial<TorrentFilters>) => filterTorrents(list, { ...none, ...filters }).map(t => t.name)

describe('filterTorrents', () => {
  const list = [
    torrent({ name: 'Ubuntu ISO', state: 'stalledUP', progress: 1, category: 'linux', tags: 'iso, stable' }),
    torrent({ name: 'Fedora', state: 'downloading', dlspeed: 10 }),
    torrent({ name: 'Old', state: 'stoppedUP', progress: 1 }),
    torrent({ name: 'Broken', state: 'missingFiles' }),
  ]

  it('keeps everything without filters', () => expect(names(list, {})).toHaveLength(4))
  it('matches names regardless of case', () => expect(names(list, { name: ' ubuntu ' })).toEqual(['Ubuntu ISO']))
  it('groups seeding states', () => expect(names(list, { status: 'seeding' })).toEqual(['Ubuntu ISO']))
  it('finds stopped torrents', () => expect(names(list, { status: 'stopped' })).toEqual(['Old']))
  it('treats any finished torrent as completed', () => expect(names(list, { status: 'completed' })).toEqual(['Ubuntu ISO', 'Old']))
  it('finds active torrents by speed', () => expect(names(list, { status: 'active' })).toEqual(['Fedora']))
  it('finds errored torrents', () => expect(names(list, { status: 'errored' })).toEqual(['Broken']))
  it('filters by category', () => expect(names(list, { category: 'linux' })).toEqual(['Ubuntu ISO']))
  it('matches whole tags only', () => {
    expect(names(list, { tag: 'stable' })).toEqual(['Ubuntu ISO'])
    expect(names(list, { tag: 'sta' })).toEqual([])
  })
})

describe('parseTags', () => {
  it('splits and trims', () => expect(parseTags('a, b ,,c')).toEqual(['a', 'b', 'c']))
  it('handles missing tags', () => expect(parseTags(undefined)).toEqual([]))
})

describe('tracker filter', () => {
  const hosts = groupTrackersByHost({
    'udp://tracker.a.test:80/announce': ['h1'],
    'https://tracker.a.test/announce': ['h2'],
    'udp://b.test:6969': ['h2'],
  })

  it('groups tracker URLs by host', () => {
    expect([...hosts.keys()].sort()).toEqual(['b.test', 'tracker.a.test'])
    expect([...hosts.get('tracker.a.test')!].sort()).toEqual(['h1', 'h2'])
  })

  it('matches torrents by host, and finds trackerless ones', () => {
    expect(matchesTracker('h1', 'tracker.a.test', hosts)).toBe(true)
    expect(matchesTracker('h1', 'b.test', hosts)).toBe(false)
    expect(matchesTracker('h3', TRACKERLESS, hosts)).toBe(true)
    expect(matchesTracker('h1', TRACKERLESS, hosts)).toBe(false)
    expect(matchesTracker('h1', '', hosts)).toBe(true)
  })

  it('keeps an unparsable tracker as it is', () => {
    expect(getTrackerHost('not a url')).toBe('not a url')
  })
})
