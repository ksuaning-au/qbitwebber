import { describe, expect, it } from 'vitest'
import { parsePeerAddresses } from './peers'

describe('parsePeerAddresses', () => {
  it('accepts IPv4 and bracketed IPv6 addresses with ports', () => {
    expect(parsePeerAddresses('203.0.113.5:6881 [2001:db8::1]:6881')).toEqual({
      valid: ['203.0.113.5:6881', '[2001:db8::1]:6881'],
      invalid: [],
    })
  })

  it('splits on spaces, commas, and new lines', () => {
    expect(parsePeerAddresses('1.2.3.4:1, 1.2.3.5:2\n1.2.3.6:3').valid).toHaveLength(3)
  })

  it('reports addresses it can\'t use', () => {
    expect(parsePeerAddresses('1.2.3.4 peer.test:6881 1.2.3.5:1')).toEqual({
      valid: ['1.2.3.5:1'],
      invalid: ['1.2.3.4', 'peer.test:6881'],
    })
  })

  it('returns nothing for blank text', () => {
    expect(parsePeerAddresses('  \n ')).toEqual({ valid: [], invalid: [] })
  })
})
