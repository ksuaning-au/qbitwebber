import { Button } from '@/components/ui/button'
import { useBannedPeers, useUnbanPeer } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'

export function BannedPeers() {
  const { data: banned, isLoading, isError } = useBannedPeers()
  const unban = useUnbanPeer()

  if (isLoading) return <p className="text-xs text-muted-foreground">Loading banned peers...</p>
  if (isError && !banned) return <p className="text-xs text-muted-foreground">Couldn't load banned peers</p>
  if (!banned?.length) return <p className="text-xs text-muted-foreground">No banned peers</p>

  return (
    <ul className="max-h-48 divide-y overflow-y-auto text-sm">
      {banned.map(ip => (
        <li key={ip} className="flex items-center justify-between gap-2 py-1.5">
          <span className="min-w-0 break-all">{ip}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-shrink-0"
            aria-label={`Unban ${ip}`}
            disabled={unban.isPending}
            onClick={() => unban.mutate(ip, { onSuccess: () => { toast.success('Peer unbanned') } })}
          >
            Unban
          </Button>
        </li>
      ))}
    </ul>
  )
}
