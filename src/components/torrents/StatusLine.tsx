import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTransferInfo } from '@/hooks/useApi'
import { formatDuration } from '@/lib/format'
import { formatSize } from '@/lib/utils'

const CONNECTION_LABELS: Record<string, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'text-green-500' },
  firewalled: { label: 'Firewalled', className: 'text-amber-500' },
  disconnected: { label: 'Disconnected', className: 'text-red-500' },
}

const size = (bytes: number | undefined) => (bytes === undefined ? '-' : formatSize(bytes))

// Free space, DHT, and connection status, with the full statistics a tap away.
export function StatusLine() {
  const { data: state } = useTransferInfo()
  const [open, setOpen] = useState(false)
  if (!state) return null

  const connection = CONNECTION_LABELS[state.connection_status ?? '']
  const parts = [
    state.free_space_on_disk !== undefined ? `Free space ${formatSize(state.free_space_on_disk)}` : null,
    state.dht_nodes !== undefined ? `DHT ${state.dht_nodes} nodes` : null,
  ].filter(Boolean)

  const stats: [string, string][] = [
    ['Downloaded, all time', size(state.alltime_dl)],
    ['Uploaded, all time', size(state.alltime_ul)],
    ['Overall ratio', state.global_ratio ?? '-'],
    ['Downloaded this session', size(state.dl_info_data)],
    ['Uploaded this session', size(state.up_info_data)],
    ['Wasted this session', size(state.total_wasted_session)],
    ['Connected peers', state.total_peer_connections === undefined ? '-' : String(state.total_peer_connections)],
    ['Read cache hits', state.read_cache_hits !== undefined ? `${state.read_cache_hits}%` : '-'],
    ['Read cache overload', state.read_cache_overload !== undefined ? `${state.read_cache_overload}%` : '-'],
    ['Write cache overload', state.write_cache_overload !== undefined ? `${state.write_cache_overload}%` : '-'],
    ['Total buffer size', size(state.total_buffers_size)],
    ['Queued disk jobs', state.queued_io_jobs === undefined ? '-' : String(state.queued_io_jobs)],
    ['Average time in queue', state.average_time_queue === undefined ? '-' : `${state.average_time_queue} ms`],
    ['Total queued size', size(state.total_queued_size)],
    ['Free disk space', size(state.free_space_on_disk)],
    ['DHT nodes', state.dht_nodes === undefined ? '-' : String(state.dht_nodes)],
  ]

  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="-mt-2 h-auto justify-start whitespace-normal px-0 py-0 text-left text-xs font-normal text-muted-foreground hover:bg-transparent hover:underline" aria-label="Show statistics" onClick={() => setOpen(true)}>
        {connection && <span className={connection.className}>{connection.label}</span>}
        {parts.length > 0 && <span>{connection ? ' · ' : ''}{parts.join(' · ')}</span>}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Statistics</DialogTitle>
          </DialogHeader>
          <dl className="divide-y text-sm">
            {stats.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-1.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
          {state.average_time_queue !== undefined && state.average_time_queue > 5000 && (
            <p className="text-xs text-amber-500">Disk jobs are waiting {formatDuration(state.average_time_queue / 1000)} on average, so the disk may be slowing transfers.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
