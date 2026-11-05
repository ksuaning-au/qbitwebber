// Values from qBittorrent's torrents/pieceStates.
export const PIECE_DOWNLOADING = 1
export const PIECE_DONE = 2

export interface PieceCounts {
  total: number
  done: number
  downloading: number
}

export function countPieces(states: number[]): PieceCounts {
  let done = 0
  let downloading = 0
  for (const state of states) {
    if (state === PIECE_DONE) done++
    else if (state === PIECE_DOWNLOADING) downloading++
  }
  return { total: states.length, done, downloading }
}

// The fewest peers that have any piece in each drawn column. -1 means unknown.
export function getAvailabilityColumns(availability: number[], columns: number): number[] {
  if (availability.length === 0 || columns <= 0) return []
  return Array.from({ length: columns }, (_, column) => {
    const start = Math.floor((column * availability.length) / columns)
    const end = Math.max(start + 1, Math.floor(((column + 1) * availability.length) / columns))
    return Math.min(...availability.slice(start, end))
  })
}

export interface PieceColumn {
  // Share of this column's pieces that are complete, from 0 to 1.
  done: number
  downloading: boolean
}

// One entry per drawn column. Each column covers at least one piece, so a small
// torrent stretches across the bar and a huge one is squeezed into it.
export function getPieceColumns(states: number[], columns: number): PieceColumn[] {
  if (states.length === 0 || columns <= 0) return []

  return Array.from({ length: columns }, (_, column) => {
    const start = Math.floor((column * states.length) / columns)
    const end = Math.max(start + 1, Math.floor(((column + 1) * states.length) / columns))
    let done = 0
    let downloading = false
    for (let i = start; i < end; i++) {
      if (states[i] === PIECE_DONE) done++
      else if (states[i] === PIECE_DOWNLOADING) downloading = true
    }
    return { done: done / (end - start), downloading }
  })
}
