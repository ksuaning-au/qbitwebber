// qBittorrent logs one error per search, without saying which plugin caused it.
export function getSearchEngineError(message: string): string | undefined {
  if (!message.startsWith('Error occurred in search engine')) return undefined
  const match = message.match(/Error: "([\s\S]*)"\s*$/)
  return (match?.[1] ?? 'See the Logs view for details.').slice(0, 160)
}
