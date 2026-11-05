import { describe, expect, it } from 'vitest'
import { getFileDownloadUrl, supportsFileDownload } from './fileDownloads'

describe('supportsFileDownload', () => {
  it.each([
    ['2.16.0', true], ['2.16', true], ['2.17.1', true], ['3.0', true],
    ['2.15.4', false], ['2.9.3', false], ['', false], ['nonsense', false],
  ])('%s is %s', (version, expected) => expect(supportsFileDownload(version)).toBe(expected))
})

describe('getFileDownloadUrl', () => {
  it('uses a relative path', () => {
    expect(getFileDownloadUrl('abc', 2)).toBe('api/v2/torrents/downloadFile?hash=abc&file=2')
  })
})
