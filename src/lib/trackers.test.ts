import { describe, expect, it } from 'vitest'
import { encodeTrackerUrls } from './trackers'

describe('encodeTrackerUrls', () => {
  it('leaves ordinary URLs unchanged', () => {
    expect(encodeTrackerUrls(['udp://a.test:80/announce'])).toBe('udp://a.test:80/announce')
  })

  it('joins several URLs', () => {
    expect(encodeTrackerUrls(['udp://a.test', 'https://b.test/x'])).toBe('udp://a.test|https://b.test/x')
  })

  it('escapes characters qBittorrent would otherwise change or split on', () => {
    expect(encodeTrackerUrls(['https://a.test/k%20y|z'])).toBe('https://a.test/k%2520y%7Cz')
  })
})
