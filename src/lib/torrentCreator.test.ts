import { describe, expect, it } from 'vitest'
import { DEFAULT_CREATOR_FORM, PIECE_SIZES, buildCreatorParams, encodeUrlList, isLibtorrentV2 } from './torrentCreator'

describe('torrent creator', () => {
  it('offers automatic and 16 KiB to 128 MiB pieces', () => {
    expect(PIECE_SIZES[0]).toBe(0)
    expect(PIECE_SIZES[1]).toBe(16 * 1024)
    expect(PIECE_SIZES.at(-1)).toBe(128 * 1024 * 1024)
  })

  it('encodes each URL and keeps blank lines as tier breaks', () => {
    expect(encodeUrlList('udp://a.test:80/announce\n\nhttps://b.test/x?y=1|2')).toBe('udp%3A%2F%2Fa.test%3A80%2Fannounce||https%3A%2F%2Fb.test%2Fx%3Fy%3D1%7C2')
  })

  it('needs a source path', () => {
    expect(buildCreatorParams(DEFAULT_CREATOR_FORM, true)).toBe('Choose the file or folder to share')
  })

  it('sends the format with libtorrent 2 and alignment with 1.x', () => {
    const form = { ...DEFAULT_CREATOR_FORM, sourcePath: ' /srv/data/show ' }
    expect(buildCreatorParams(form, true)).toEqual({ sourcePath: '/srv/data/show', pieceSize: '0', private: 'false', startSeeding: 'true', format: 'hybrid' })
    expect(buildCreatorParams(form, false)).toEqual({ sourcePath: '/srv/data/show', pieceSize: '0', private: 'false', startSeeding: 'true', optimizeAlignment: 'true' })
  })

  it('adds the optional fields only when filled in', () => {
    const params = buildCreatorParams({ ...DEFAULT_CREATOR_FORM, sourcePath: '/a', trackers: 'udp://t', comment: ' hi ', torrentFilePath: '/out/a.torrent' }, true)
    expect(params).toMatchObject({ trackers: 'udp%3A%2F%2Ft', comment: 'hi', torrentFilePath: '/out/a.torrent' })
    expect(params).not.toHaveProperty('urlSeeds')
  })

  it('reads the libtorrent major version', () => {
    expect(isLibtorrentV2('2.0.11.0')).toBe(true)
    expect(isLibtorrentV2('1.2.19.0')).toBe(false)
    expect(isLibtorrentV2(undefined)).toBe(false)
  })
})
