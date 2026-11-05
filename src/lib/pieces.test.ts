import { describe, expect, it } from 'vitest'
import { countPieces, getAvailabilityColumns, getPieceColumns } from './pieces'

describe('countPieces', () => {
  it('counts each state', () => {
    expect(countPieces([2, 2, 1, 0, 0, 0])).toEqual({ total: 6, done: 2, downloading: 1 })
  })

  it('handles a torrent without piece data yet', () => {
    expect(countPieces([])).toEqual({ total: 0, done: 0, downloading: 0 })
  })
})

describe('getPieceColumns', () => {
  it('squeezes more pieces than columns, covering every piece once', () => {
    expect(getPieceColumns([2, 2, 2, 0, 1, 0], 2)).toEqual([
      { done: 1, downloading: false },
      { done: 0, downloading: true },
    ])
  })

  it('averages the pieces within a column', () => {
    expect(getPieceColumns([2, 0, 0, 0], 1)).toEqual([{ done: 0.25, downloading: false }])
  })

  it('stretches fewer pieces than columns', () => {
    expect(getPieceColumns([2, 0], 4)).toEqual([
      { done: 1, downloading: false },
      { done: 1, downloading: false },
      { done: 0, downloading: false },
      { done: 0, downloading: false },
    ])
  })

  it('returns nothing to draw without pieces or width', () => {
    expect(getPieceColumns([], 100)).toEqual([])
    expect(getPieceColumns([2], 0)).toEqual([])
  })
})

describe('getAvailabilityColumns', () => {
  it('keeps the lowest availability in each column', () => {
    expect(getAvailabilityColumns([3, 0, 2, 5], 2)).toEqual([0, 2])
  })

  it('stretches a few pieces across many columns', () => {
    expect(getAvailabilityColumns([1, 4], 4)).toEqual([1, 1, 4, 4])
  })

  it('returns nothing without data', () => {
    expect(getAvailabilityColumns([], 10)).toEqual([])
  })
})
