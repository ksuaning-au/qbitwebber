import { describe, expect, it } from 'vitest'
import { parseBannedPeers, removeBannedPeer } from './bannedPeers'

describe('parseBannedPeers', () => {
  it('reads one address per line', () => {
    expect(parseBannedPeers('192.0.2.1\n2001:db8::1')).toEqual(['192.0.2.1', '2001:db8::1'])
  })

  it('ignores blank lines and spaces', () => {
    expect(parseBannedPeers('\n 192.0.2.1 \n\n')).toEqual(['192.0.2.1'])
  })

  it('returns nothing for an empty or missing list', () => {
    expect(parseBannedPeers('')).toEqual([])
    expect(parseBannedPeers(undefined)).toEqual([])
  })
})

describe('removeBannedPeer', () => {
  it('removes only the given address', () => {
    expect(removeBannedPeer('192.0.2.1\n192.0.2.10', '192.0.2.1')).toBe('192.0.2.10')
  })

  it('leaves an empty list when the last address is removed', () => {
    expect(removeBannedPeer('192.0.2.1', '192.0.2.1')).toBe('')
  })

  it('keeps the list when the address is not in it', () => {
    expect(removeBannedPeer('192.0.2.1', '192.0.2.2')).toBe('192.0.2.1')
  })
})
