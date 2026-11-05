// qBittorrent 5.1 and newer percent-decode each URL in torrents/removeTrackers, and 5.0 doesn't.
// Escaping only these two characters leaves ordinary tracker URLs readable by both.
export function encodeTrackerUrls(urls: string[]): string {
  return urls.map(url => url.replace(/%/g, '%25').replace(/\|/g, '%7C')).join('|')
}
