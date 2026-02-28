import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLogs } from '@/hooks/useApi'
import type { LogType } from '@/types'

function getLogIcon(type: LogType) {
  switch (type) {
    case 'CRITICAL':
    case 'ERROR':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    case 'WARNING':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    default:
      return <Info className="h-4 w-4 text-blue-500" />
  }
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString()
}

export function LogsView() {
  const { data: logs, isLoading } = useLogs()

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
  }

  if (!logs || logs.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No logs</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-1">
            {logs.slice(0, 100).map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2 py-1 text-sm"
              >
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </span>
                {getLogIcon(log.type as LogType)}
                <span className="break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
