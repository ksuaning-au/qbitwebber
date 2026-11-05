import { describe, expect, it } from 'vitest'
import { getSearchEngineError } from './searchErrors'

describe('getSearchEngineError', () => {
  it('extracts the reason', () => {
    const message = 'Error occurred in search engine. Search query: "a". Category: "all". Engines: "x, y". Error: "Connection error: refused"'
    expect(getSearchEngineError(message)).toBe('Connection error: refused')
  })
  it('ignores other log entries', () => expect(getSearchEngineError('Some other warning')).toBeUndefined())
  it('has a fallback when the format changes', () => {
    expect(getSearchEngineError('Error occurred in search engine.')).toBe('See the Logs view for details.')
  })
})
