import { describe, expect, it } from 'vitest'
import { applyMainDataUpdate, type MainData } from './mainData'

const first = applyMainDataUpdate(null, {
  rid: 1,
  full_update: true,
  torrents: { a: { name: 'A', progress: 0.5, dlspeed: 10 }, b: { name: 'B', progress: 1 } },
  server_state: { dht_nodes: 5, free_space_on_disk: 100 },
})

describe('applyMainDataUpdate', () => {
  it('starts from a full update and adds each torrent\'s hash', () => {
    expect(first.rid).toBe(1)
    expect(first.torrents.a).toMatchObject({ hash: 'a', name: 'A', progress: 0.5 })
    expect(first.serverState).toEqual({ dht_nodes: 5, free_space_on_disk: 100 })
  })

  it('merges only the changed fields', () => {
    const next = applyMainDataUpdate(first, { rid: 2, torrents: { a: { progress: 0.6 } }, server_state: { dht_nodes: 7 } })
    expect(next.torrents.a).toMatchObject({ name: 'A', progress: 0.6, dlspeed: 10 })
    expect(next.torrents.b).toBe(first.torrents.b)
    expect(next.serverState).toEqual({ dht_nodes: 7, free_space_on_disk: 100 })
  })

  it('adds new torrents and drops removed ones', () => {
    const next = applyMainDataUpdate(first, { rid: 2, torrents: { c: { name: 'C' } }, torrents_removed: ['b'] })
    expect(Object.keys(next.torrents).sort()).toEqual(['a', 'c'])
  })

  it('replaces everything on a later full update', () => {
    const next = applyMainDataUpdate(first, { rid: 9, full_update: true, torrents: { c: { name: 'C' } }, server_state: { dht_nodes: 1 } })
    expect(Object.keys(next.torrents)).toEqual(['c'])
    expect(next.serverState).toEqual({ dht_nodes: 1 })
  })

  it('keeps the tracker map up to date', () => {
    const withTrackers = applyMainDataUpdate(first, { rid: 2, trackers: { 'udp://t.test': ['a'], 'udp://u.test': ['a', 'b'] } })
    expect(withTrackers.trackers).toEqual({ 'udp://t.test': ['a'], 'udp://u.test': ['a', 'b'] })
    const next = applyMainDataUpdate(withTrackers, { rid: 3, trackers: { 'udp://u.test': ['b'] }, trackers_removed: ['udp://t.test'] })
    expect(next.trackers).toEqual({ 'udp://u.test': ['b'] })
  })

  it('does not change the previous state', () => {
    const before: MainData = JSON.parse(JSON.stringify(first))
    applyMainDataUpdate(first, { rid: 2, torrents: { a: { progress: 1 } }, torrents_removed: ['b'] })
    expect(first).toEqual(before)
  })
})
