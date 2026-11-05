// qBittorrent doesn't say what each search was for, so this browser remembers it.
const PATTERNS_KEY = 'qbit_search_patterns'

export function readSearchPatterns(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(PATTERNS_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

export function rememberSearchPattern(id: number, pattern: string) {
  try {
    localStorage.setItem(PATTERNS_KEY, JSON.stringify({ ...readSearchPatterns(), [id]: pattern }))
  } catch {
    // Without storage the list just shows search numbers.
  }
}
