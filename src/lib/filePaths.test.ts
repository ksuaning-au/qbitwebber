import { describe, expect, it } from 'vitest'
import { getNameProblem, getRenamedPath } from './filePaths'

describe('getRenamedPath', () => {
  it('keeps the folders and replaces the last part', () => {
    expect(getRenamedPath('Show/Season 1/ep1.mkv', 'Episode 1.mkv')).toBe('Show/Season 1/Episode 1.mkv')
  })

  it('renames a top-level item', () => {
    expect(getRenamedPath('movie.mkv', 'film.mkv')).toBe('film.mkv')
  })
})

describe('getNameProblem', () => {
  it('accepts an ordinary name', () => {
    expect(getNameProblem('Episode 1.mkv')).toBeNull()
  })

  it.each([[''], ['   '], ['a/b'], ['a\\b'], ['..']])('rejects %j', (name) => {
    expect(getNameProblem(name)).not.toBeNull()
  })
})
