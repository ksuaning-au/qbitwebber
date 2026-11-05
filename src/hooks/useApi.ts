import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qbitClient } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { PIECE_DONE } from '@/lib/pieces'
import type { RSSRule } from '@/types'

function showActionError(message: string, error: unknown) {
  toast.error(message, { description: error instanceof Error ? error.message : undefined })
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

export function useTransferInfo() {
  return useQuery({
    queryKey: ['transfer', 'info'],
    queryFn: () => qbitClient.getTransferInfo(),
    enabled: !!qbitClient.isConfigured(),
    refetchInterval: 3000,
  })
}

export function useTorrents(filter?: string, category?: string) {
  return useQuery({
    queryKey: ['torrents', filter, category],
    queryFn: () => qbitClient.getTorrents(filter, category),
    enabled: !!qbitClient.isConfigured(),
    refetchInterval: 5000,
  })
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

export function useSearchPlugins() {
  return useQuery({
    queryKey: ['search', 'plugins'],
    queryFn: () => qbitClient.searchPlugins(),
  })
}

// For one-off torrent actions: shows failures and refreshes the list afterward.
export function useTorrentAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ work }: { work: () => Promise<unknown>; failed: string }) => work(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['torrents'] })
      queryClient.invalidateQueries({ queryKey: ['tags'] })
    },
    onError: (error, { failed }) => showActionError(failed, error),
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

export function useAddTorrent() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ url, file, savePath, category }: { 
      url?: string; 
      file?: File; 
      savePath?: string;
      category?: string 
    }) => {
      if (url) {
        return qbitClient.addTorrentUrl(url, { savePath, category })
      } else if (file) {
        return qbitClient.addTorrentFile(file, { savePath, category })
      }
      throw new Error('Either url or file must be provided')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['torrents'] })
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

export function useLogs() {
  return useQuery({
    queryKey: ['logs'],
    queryFn: () => qbitClient.getLogs(true, -1),
    enabled: !!qbitClient.isConfigured(),
    refetchInterval: 5000,
  })
}
