import { useEffect, useRef } from 'react'
import { useTorrentPieces } from '@/hooks/useApi'
import { countPieces, getPieceColumns } from '@/lib/pieces'

const DONE_COLOR = '#22c55e'
const DOWNLOADING_COLOR = '#f59e0b'
// Keeps a column with only a few finished pieces visible on a huge torrent.
const MIN_DONE_OPACITY = 0.25

function drawPieces(canvas: HTMLCanvasElement, states: number[]) {
  const context = canvas.getContext('2d')
  if (!context) return

  const width = Math.round(canvas.clientWidth * window.devicePixelRatio)
  const height = Math.round(canvas.clientHeight * window.devicePixelRatio)
  // Setting the size also clears the canvas.
  canvas.width = width
  canvas.height = height

  getPieceColumns(states, width).forEach((column, x) => {
    if (column.downloading) {
      context.globalAlpha = 1
      context.fillStyle = DOWNLOADING_COLOR
    } else if (column.done > 0) {
      context.globalAlpha = MIN_DONE_OPACITY + (1 - MIN_DONE_OPACITY) * column.done
      context.fillStyle = DONE_COLOR
    } else {
      return
    }
    context.fillRect(x, 0, 1, height)
  })
}

function LegendItem({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-sm ${className}`} aria-hidden="true" />
      {label}
    </span>
  )
}

// The file list and action forms stay usable if this fails, so it only reports in place.
export function PieceBar({ hash, torrentComplete }: { hash: string; torrentComplete: boolean }) {
  const { data: states, isError, isLoading } = useTorrentPieces(hash, torrentComplete)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !states) return

    const draw = () => drawPieces(canvas, states)
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [states])

  if (isLoading) return <p className="px-2 py-2 text-xs text-muted-foreground">Loading pieces...</p>
  if (isError) return <p className="px-2 py-2 text-xs text-muted-foreground">Couldn't load this torrent's pieces.</p>
  if (!states?.length) return <p className="px-2 py-2 text-xs text-muted-foreground">Piece information isn't available yet.</p>

  const { total, done, downloading } = countPieces(states)
  const summary = `${done.toLocaleString()} of ${total.toLocaleString()} pieces${downloading ? `, ${downloading.toLocaleString()} downloading` : ''}`

  return (
    <div className="space-y-1 px-2 py-2">
      <canvas ref={canvasRef} role="img" aria-label={summary} className="block h-4 w-full rounded-sm bg-muted" />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{summary}</span>
        <span className="flex items-center gap-2">
          <LegendItem className="bg-green-500" label="Done" />
          <LegendItem className="bg-amber-500" label="Downloading" />
          <LegendItem className="border bg-muted" label="Missing" />
        </span>
      </div>
    </div>
  )
}
