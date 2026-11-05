import { describe, expect, it } from 'vitest'
import { ALL_PREFS, getChangedPreferences, toFormValue, toStoredValue } from './preferences'

const def = (key: string) => {
  const found = ALL_PREFS.find(p => p.key === key)
  if (!found) throw new Error(`No preference ${key}`)
  return found
}

describe('preference values', () => {
  it('shows speeds in KiB/s and stores bytes', () => {
    expect(toFormValue(def('dl_limit'), 102400)).toBe(100)
    expect(toStoredValue(def('dl_limit'), '100')).toBe(102400)
  })

  it('keeps 0 and -1 as they are, since they mean no limit', () => {
    expect(toFormValue(def('dl_limit'), 0)).toBe(0)
    expect(toStoredValue(def('dl_limit'), '0')).toBe(0)
    expect(toStoredValue(def('max_connec'), '-1')).toBe(-1)
  })

  it('stores the chosen option with its original type', () => {
    expect(toStoredValue(def('encryption'), '1')).toBe(1)
    expect(toStoredValue(def('proxy_type'), 'SOCKS5')).toBe('SOCKS5')
    expect(toFormValue(def('auto_tmm_enabled'), true)).toBe('true')
    expect(toStoredValue(def('auto_tmm_enabled'), 'false')).toBe(false)
  })

  it('rejects text and fractions in whole-number fields', () => {
    expect(toStoredValue(def('listen_port'), 'abc')).toBeUndefined()
    expect(toStoredValue(def('listen_port'), '1.5')).toBeUndefined()
    expect(toStoredValue(def('listen_port'), '')).toBeUndefined()
  })
})

describe('getChangedPreferences', () => {
  const original = { dl_limit: 0, listen_port: 6881, dht: true, schedule_from_hour: 8, schedule_from_min: 30, max_ratio_enabled: false, max_ratio: -1 }

  it('sends only what changed', () => {
    expect(getChangedPreferences(original, { dl_limit: '0', listen_port: '7000', dht: true })).toEqual({ changes: { listen_port: 7000 }, invalid: [] })
  })

  it('sends both halves of a schedule time', () => {
    expect(getChangedPreferences(original, { schedule_from_hour: '9' }).changes).toEqual({ schedule_from_hour: 9, schedule_from_min: 30 })
  })

  it('reports invalid fields instead of sending them', () => {
    expect(getChangedPreferences(original, { listen_port: 'x' })).toEqual({ changes: {}, invalid: ['Port for incoming connections'] })
  })

  it('needs a value when a limit is switched on', () => {
    expect(getChangedPreferences(original, { max_ratio_enabled: true }).invalid).toEqual(['Ratio'])
    expect(getChangedPreferences(original, { max_ratio_enabled: true, max_ratio: '2' })).toEqual({ changes: { max_ratio_enabled: true, max_ratio: 2 }, invalid: [] })
  })

  it('passes custom editor values through', () => {
    expect(getChangedPreferences(original, { scan_dirs: { '/watch': 0 } }).changes).toEqual({ scan_dirs: { '/watch': 0 } })
  })

  it('lists every preference key only once', () => {
    const keys = ALL_PREFS.map(p => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
