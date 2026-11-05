import { describe, expect, it } from 'vitest'
import { formatSize } from './utils'

describe('formatSize', () => {
  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1536, '1.5 KB'],
    [2345678, '2.2 MB'],
    [1073741824, '1 GB'],
  ])('formats %d', (bytes, text) => expect(formatSize(bytes)).toBe(text))
})
