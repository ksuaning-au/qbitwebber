// qBittorrent uses 8640000 seconds (100 days) to mean "infinite" for ETA-like values.
const INFINITE_SECONDS = 8640000

// Two units at most, such as "2d 3h" or "5m 10s".
export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0 || seconds >= INFINITE_SECONDS) return '-'
  const units: [number, string][] = [[86400, 'd'], [3600, 'h'], [60, 'm'], [1, 's']]
  const parts: string[] = []
  let rest = Math.floor(seconds)
  for (const [size, label] of units) {
    const count = Math.floor(rest / size)
    rest -= count * size
    if (count > 0 || (parts.length > 0 && parts.length < 2)) parts.push(`${count}${label}`)
    if (parts.length === 2) break
  }
  return parts.length ? parts.join(' ') : '0s'
}
