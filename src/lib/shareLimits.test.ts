import { describe, expect, it } from 'vitest'
import { getShareLimitForm, parseShareLimits, type ShareLimitForm } from './shareLimits'

const limits = (ratio: number, seeding: number, inactive: number) => ({
  ratio_limit: ratio,
  seeding_time_limit: seeding,
  inactive_seeding_time_limit: inactive,
})

describe('getShareLimitForm', () => {
  it('recognizes global limits', () => {
    expect(getShareLimitForm(limits(-2, -2, -2)).mode).toBe('global')
  })

  it('recognizes no limit', () => {
    expect(getShareLimitForm(limits(-1, -1, -1)).mode).toBe('none')
  })

  it('fills in custom limits and leaves unset ones blank', () => {
    expect(getShareLimitForm({ ...limits(1.5, -1, 60), share_limit_action: 'Stop' })).toEqual({
      mode: 'custom',
      ratio: '1.5',
      seedingMinutes: '',
      inactiveMinutes: '60',
      action: 'Stop',
    })
  })

  it('treats a zero limit as custom, not as unset', () => {
    const form = getShareLimitForm(limits(0, -1, -1))
    expect(form.mode).toBe('custom')
    expect(form.ratio).toBe('0')
  })

  it('handles servers that send no inactive limit or action', () => {
    const form = getShareLimitForm({ ratio_limit: -2, seeding_time_limit: -2 } as never)
    expect(form.mode).toBe('global')
    expect(form.action).toBe('Default')
  })
})

describe('parseShareLimits', () => {
  const custom: ShareLimitForm = { mode: 'custom', ratio: '', seedingMinutes: '', inactiveMinutes: '', action: 'Default' }

  it('sends the special value for global limits and resets the action', () => {
    expect(parseShareLimits({ ...custom, mode: 'global', ratio: '2', action: 'Stop' })).toEqual({
      ratioLimit: -2, seedingTimeLimit: -2, inactiveSeedingTimeLimit: -2, shareLimitAction: 'Default',
    })
  })

  it('sends the special value for no limit', () => {
    expect(parseShareLimits({ ...custom, mode: 'none' })).toEqual({
      ratioLimit: -1, seedingTimeLimit: -1, inactiveSeedingTimeLimit: -1, shareLimitAction: 'Default',
    })
  })

  it('treats blank boxes as no limit and keeps the action', () => {
    expect(parseShareLimits({ ...custom, ratio: ' 2.5 ', seedingMinutes: '90', action: 'Stop' })).toEqual({
      ratioLimit: 2.5, seedingTimeLimit: 90, inactiveSeedingTimeLimit: -1, shareLimitAction: 'Stop',
    })
  })

  it('accepts zero', () => {
    expect(parseShareLimits({ ...custom, ratio: '0' })?.ratioLimit).toBe(0)
  })

  it.each([
    ['negative ratio', { ratio: '-1' }],
    ['text ratio', { ratio: 'abc' }],
    ['fractional minutes', { seedingMinutes: '1.5' }],
    ['negative minutes', { inactiveMinutes: '-5' }],
  ])('rejects %s', (_name, values) => {
    expect(parseShareLimits({ ...custom, ...values })).toBeNull()
  })
})
