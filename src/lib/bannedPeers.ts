// qBittorrent's banned_IPs preference holds one address per line.
export function parseBannedPeers(value: unknown): string[] {
  return typeof value === 'string' ? value.split('\n').map(ip => ip.trim()).filter(Boolean) : []
}

export function removeBannedPeer(value: unknown, ip: string): string {
  return parseBannedPeers(value).filter(banned => banned !== ip).join('\n')
}
