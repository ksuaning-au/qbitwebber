import type { Torrent } from '@/types'

// qBittorrent's special values for a torrent's ratio and time limits.
export const USE_GLOBAL_LIMIT = -2
export const NO_LIMIT = -1
export const DEFAULT_LIMIT_ACTION = 'Default'

export type ShareLimitMode = 'global' | 'none' | 'custom'

export interface ShareLimits {
  ratioLimit: number
  seedingTimeLimit: number
  inactiveSeedingTimeLimit: number
  shareLimitAction: string
}

export interface ShareLimitForm {
  mode: ShareLimitMode
  ratio: string
  seedingMinutes: string
  inactiveMinutes: string
  action: string
}

type TorrentLimits = Pick<Torrent, 'ratio_limit' | 'seeding_time_limit' | 'inactive_seeding_time_limit' | 'share_limit_action'>

const toField = (limit: number) => (limit >= 0 ? String(limit) : '')

export function getShareLimitForm(torrent: TorrentLimits): ShareLimitForm {
  // Older qBittorrent versions don't send an inactive limit.
  const inactive = torrent.inactive_seeding_time_limit ?? USE_GLOBAL_LIMIT
  const limits = [torrent.ratio_limit, torrent.seeding_time_limit]

  const mode: ShareLimitMode = limits.every(limit => limit === USE_GLOBAL_LIMIT) && inactive === USE_GLOBAL_LIMIT
    ? 'global'
    : limits.every(limit => limit === NO_LIMIT) && (inactive === NO_LIMIT || inactive === USE_GLOBAL_LIMIT)
      ? 'none'
      : 'custom'

  return {
    mode,
    ratio: toField(torrent.ratio_limit),
    seedingMinutes: toField(torrent.seeding_time_limit),
    inactiveMinutes: toField(inactive),
    action: torrent.share_limit_action ?? DEFAULT_LIMIT_ACTION,
  }
}

// A blank box means no limit. Returns null when a box holds an invalid value.
function parseLimit(text: string, wholeNumber: boolean): number | null {
  const trimmed = text.trim()
  if (!trimmed) return NO_LIMIT
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0 || (wholeNumber && !Number.isInteger(value))) return null
  return value
}

export function parseShareLimits(form: ShareLimitForm): ShareLimits | null {
  if (form.mode !== 'custom') {
    const limit = form.mode === 'global' ? USE_GLOBAL_LIMIT : NO_LIMIT
    return { ratioLimit: limit, seedingTimeLimit: limit, inactiveSeedingTimeLimit: limit, shareLimitAction: DEFAULT_LIMIT_ACTION }
  }

  const ratioLimit = parseLimit(form.ratio, false)
  const seedingTimeLimit = parseLimit(form.seedingMinutes, true)
  const inactiveSeedingTimeLimit = parseLimit(form.inactiveMinutes, true)
  if (ratioLimit === null || seedingTimeLimit === null || inactiveSeedingTimeLimit === null) return null

  return { ratioLimit, seedingTimeLimit, inactiveSeedingTimeLimit, shareLimitAction: form.action }
}
