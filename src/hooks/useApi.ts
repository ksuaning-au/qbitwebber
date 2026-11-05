import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qbitClient } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { parseBannedPeers, removeBannedPeer } from '@/lib/bannedPeers'
import { PIECE_DONE } from '@/lib/pieces'
import { applyMainDataUpdate, type MainData } from '@/lib/mainData'
import type { RSSRule } from '@/types'

function showActionError(message: string, error: unknown) {
  toast.error(message, { description: error instanceof Error ? error.message : undefined })
}

export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => qbitClient.getPreferences(),
    enabled: !!qbitClient.isConfigured(),
    // Edits are kept separately, so a refresh never overwrites typing.
    refetchOnWindowFocus: false,
  })
}

export function useSavePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (changes: Record<string, unknown>) => qbitClient.setPreferences(changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
      queryClient.invalidateQueries({ queryKey: ['bannedPeers'] })
    },
    onError: (error) => showActionError('Failed to save settings', error),
  })
}

export function useAppVersion() {
  return useQuery({
    queryKey: ['app', 'version'],
    queryFn: () => qbitClient.getAppVersion(),
    enabled: !!qbitClient.isConfigured(),
  })
}

export function useWebApiVersion() {
  return useQuery({
    queryKey: ['app', 'webApiVersion'],
    queryFn: () => qbitClient.getWebApiVersion(),
    staleTime: Infinity,
  })
}

const MAINDATA_KEY = ['torrents', 'maindata']

// One incremental request feeds the torrent list, speeds, and status. Its key starts with
// 'torrents', so the existing refreshes after an action also refresh it.
export function useMainData<T>(select: (data: MainData) => T) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: MAINDATA_KEY,
    queryFn: async () => {
      const previous = queryClient.getQueryData<MainData>(MAINDATA_KEY) ?? null
      return applyMainDataUpdate(previous, await qbitClient.getMainData(previous?.rid ?? 0))
    },
    select,
    enabled: !!qbitClient.isConfigured(),
    refetchInterval: 2000,
  })
}

const selectTorrents = (data: MainData) => Object.values(data.torrents)
const selectServerState = (data: MainData) => data.serverState

export function useTorrents() {
  return useMainData(selectTorrents)
}

export function useTransferInfo() {
  return useMainData(selectServerState)
}

const selectTrackers = (data: MainData) => data.trackers

export function useTrackerMap() {
  return useMainData(selectTrackers)
}

export function useTorrentFiles(hash: string | null) {
  return useQuery({
    queryKey: ['torrent', hash, 'files'],
    queryFn: () => hash ? qbitClient.getTorrentFiles(hash) : Promise.resolve([]),
    enabled: !!hash,
    refetchInterval: 5000,
  })
}

export function useTorrentTrackers(hash: string) {
  return useQuery({
    queryKey: ['torrent', hash, 'trackers'],
    queryFn: () => qbitClient.getTorrentTrackers(hash),
    enabled: !!hash,
    refetchInterval: 5000,
  })
}

export function useTorrentPeers(hash: string) {
  return useQuery({
    queryKey: ['torrent', hash, 'peers'],
    queryFn: () => qbitClient.getTorrentPeers(hash),
    enabled: !!hash,
    refetchInterval: 5000,
  })
}

// Keeps polling a finished torrent until the bar has caught up, and again after a recheck.
export function useTorrentPieces(hash: string, torrentComplete: boolean) {
  return useQuery({
    queryKey: ['torrent', hash, 'pieces'],
    queryFn: () => qbitClient.getPieceStates(hash),
    refetchInterval: (query) => (torrentComplete && query.state.data?.every(state => state === PIECE_DONE) ? false : 5000),
  })
}

export function useWebSeeds(hash: string) {
  return useQuery({
    queryKey: ['torrent', hash, 'webseeds'],
    queryFn: () => qbitClient.getWebSeeds(hash),
    enabled: !!hash,
  })
}

export function useTorrentAvailability(hash: string, enabled: boolean) {
  return useQuery({
    queryKey: ['torrent', hash, 'availability'],
    queryFn: () => qbitClient.getPieceAvailability(hash),
    enabled,
    refetchInterval: 5000,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => qbitClient.getCategories(),
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: () => qbitClient.getTags(),
  })
}

export function useSearchPlugins(refetchInterval: number | false = false) {
  return useQuery({
    queryKey: ['search', 'plugins'],
    queryFn: () => qbitClient.searchPlugins(),
    refetchInterval,
  })
}

// For changes to search plugins: shows failures and refreshes the list afterward.
export function useSearchPluginAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ work }: { work: () => Promise<unknown>; failed: string }) => work(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search', 'plugins'] })
    },
    onError: (error, { failed }) => showActionError(failed, error),
  })
}

// For one-off torrent actions: shows failures and refreshes the list and open tabs afterward.
export function useTorrentAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ work }: { work: () => Promise<unknown>; failed: string }) => work(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['torrents'] })
      queryClient.invalidateQueries({ queryKey: ['torrent'] })
      queryClient.invalidateQueries({ queryKey: ['bannedPeers'] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
    onError: (error, { failed }) => showActionError(failed, error),
  })
}

export function useBannedPeers() {
  return useQuery({
    queryKey: ['bannedPeers'],
    queryFn: () => qbitClient.getPreferences(),
    select: (prefs) => parseBannedPeers(prefs.banned_IPs),
  })
}

// Reads the current list first, so a ban made elsewhere since the page loaded isn't lost.
export function useUnbanPeer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ip: string) => {
      const prefs = await qbitClient.getPreferences()
      await qbitClient.setPreferences({ banned_IPs: removeBannedPeer(prefs.banned_IPs, ip) })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bannedPeers'] })
    },
    onError: (error) => showActionError('Failed to unban peer', error),
  })
}

export function useRSSRules() {
  return useQuery({
    queryKey: ['rss', 'rules'],
    queryFn: () => qbitClient.getRSSRules(),
  })
}

export function useSetRSSRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ name, rule }: { name: string; rule: RSSRule }) => qbitClient.setRSSRule(name, rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss', 'rules'] })
    },
  })
}

export function useRemoveRSSRule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => qbitClient.removeRSSRule(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss', 'rules'] })
    },
  })
}

export function useDeleteTorrents() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ hashes, deleteFiles }: { hashes: string[]; deleteFiles?: boolean }) =>
      qbitClient.deleteTorrents(hashes, deleteFiles),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['torrents'] })
    },
    onError: (error) => showActionError('Failed to delete', error),
  })
}

export function useSetFilePriority() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ hash, id, priority }: { hash: string; id: string; priority: number }) =>
      qbitClient.setFilePriority(hash, id, priority),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['torrent', variables.hash, 'files'] })
    },
  })
}

export function usePauseTorrents() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (hashes: string[]) => qbitClient.pauseTorrents(hashes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['torrents'] })
    },
    onError: (error) => showActionError('Failed to pause', error),
  })
}

export function useResumeTorrents() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (hashes: string[]) => qbitClient.resumeTorrents(hashes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['torrents'] })
    },
    onError: (error) => showActionError('Failed to resume', error),
  })
}

export function useRSSFeeds() {
  return useQuery({
    queryKey: ['rss', 'feeds'],
    queryFn: () => qbitClient.getRSSFeeds(),
    enabled: !!qbitClient.isConfigured(),
  })
}

export function useRSSItems(feedUid: string) {
  return useQuery({
    queryKey: ['rss', 'items', feedUid],
    queryFn: () => qbitClient.getRSSItems(feedUid),
    enabled: !!feedUid && !!qbitClient.isConfigured(),
  })
}

export function useAddRSSFeed() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (url: string) => qbitClient.addRSSFeed(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss'] })
    },
  })
}

export function useRemoveRSSFeed() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (path: string) => qbitClient.removeRSSFeed(path),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss'] })
    },
  })
}

export function useLogs(levels: { normal: boolean; info: boolean; warning: boolean; critical: boolean }) {
  return useQuery({
    queryKey: ['logs', 'main', levels],
    queryFn: () => qbitClient.getLogs(levels),
    enabled: !!qbitClient.isConfigured(),
    refetchInterval: 5000,
  })
}

export function usePeerLog(enabled: boolean) {
  return useQuery({
    queryKey: ['logs', 'peers'],
    queryFn: () => qbitClient.getPeerLog(),
    enabled: enabled && !!qbitClient.isConfigured(),
    refetchInterval: 5000,
  })
}
