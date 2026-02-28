import { useState } from 'react'
import { Plus, Trash2, ExternalLink, RefreshCw, Rss } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog'
import { useRSSFeeds, useRSSItems, useAddRSSFeed, useRemoveRSSFeed } from '@/hooks/useApi'
import { toast } from '@/hooks/use-toast'

export function RSSView() {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null)
  const [newFeedUrl, setNewFeedUrl] = useState('')
  
  const { data: feedsData, isLoading: feedsLoading } = useRSSFeeds()
  const { data: itemsData, isLoading: itemsLoading } = useRSSItems(selectedFeed || '')
  const addFeed = useAddRSSFeed()
  const removeFeed = useRemoveRSSFeed()

  const feeds = feedsData?.feeds || []
  const items = itemsData?.articles || []

  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFeedUrl) return

    try {
      await addFeed.mutateAsync(newFeedUrl)
      setNewFeedUrl('')
      toast.success('Feed added')
    } catch {
      toast.error('Failed to add feed')
    }
  }

  const handleRemoveFeed = async (uid: string) => {
    try {
      await removeFeed.mutateAsync(uid)
      if (selectedFeed === uid) {
        setSelectedFeed(null)
      }
      toast('Feed removed')
    } catch {
      toast.error('Failed to remove feed')
    }
  }

  if (feedsLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading feeds...</div>
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Feeds sidebar */}
      <div className="w-full md:w-64 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Feeds</h2>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add RSS Feed</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddFeed} className="space-y-4">
                <Input
                  placeholder="Feed URL"
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  required
                />
                <Button type="submit" className="w-full" disabled={addFeed.isPending}>
                  Add Feed
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {feeds.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feeds configured</p>
        ) : (
          feeds.map((feed) => (
            <Card 
              key={feed.uid}
              className={`cursor-pointer hover:bg-accent ${selectedFeed === feed.uid ? 'border-primary' : ''}`}
              onClick={() => setSelectedFeed(feed.uid)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{feed.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                    {feed.unreadCount > 0 && (
                      <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                        {feed.unreadCount}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveFeed(feed.uid)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Articles */}
      <div className="flex-1">
        {selectedFeed ? (
          itemsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading articles...</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No articles</div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Rss className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-sm hover:underline"
                        >
                          {item.title}
                        </a>
                        {item.date && (
                          <p className="text-xs text-muted-foreground">{item.date}</p>
                        )}
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Select a feed to view articles
          </div>
        )}
      </div>
    </div>
  )
}
