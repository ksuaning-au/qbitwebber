import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { qbitClient } from '@/lib/api'

export function useAppVersion() {
  return useQuery({
    queryKey: ['app', 'version'],
    queryFn: () => qbitClient.getAppVersion(),
    enabled: !!qbitClient.isConfigured(),
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

export function useTorrentFiles(hash: string) {
  return useQuery({
    queryKey: ['torrent', hash, 'files'],
    queryFn: () => qbitClient.getTorrentFiles(hash),
    enabled: !!hash && !!qbitClient.isConfigured(),
  })
}

export function useTorrentTrackers(hash: string) {
  return useQuery({
    queryKey: ['torrent', hash, 'trackers'],
    queryFn: () => qbitClient.getTorrentTrackers(hash),
    enabled: !!hash && !!qbitClient.isConfigured(),
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
  })
}

export function usePauseTorrents() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (hashes: string[]) => qbitClient.pauseTorrents(hashes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['torrents'] })
    },
  })
}

export function useResumeTorrents() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (hashes: string[]) => qbitClient.resumeTorrents(hashes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['torrents'] })
    },
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
    mutationFn: (uid: string) => qbitClient.removeRSSFeed(uid),
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
