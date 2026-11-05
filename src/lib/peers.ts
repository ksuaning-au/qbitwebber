// qBittorrent only accepts an IP address here, not a host name.
const PEER_ADDRESS = /^(\d{1,3}(\.\d{1,3}){3}|\[[0-9a-f:.]+\]):\d{1,5}$/i

export function parsePeerAddresses(text: string): { valid: string[]; invalid: string[] } {
  const entries = text.split(/[\s,|]+/).filter(Boolean)
  return {
    valid: entries.filter(entry => PEER_ADDRESS.test(entry)),
    invalid: entries.filter(entry => !PEER_ADDRESS.test(entry)),
  }
}
