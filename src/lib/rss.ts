import type { RSSFeed, RSSItem } from '@/types'

interface RawArticle {
  id: string
  title: string
  date?: string
  author?: string
  description?: string
  link?: string
  torrentURL?: string
  isRead?: boolean
}

interface RawFeed {
  uid: string
  url: string
  title?: string
  hasError?: boolean
  lastBuildDate?: string
  articles?: RawArticle[]
}

// rss/items returns a tree: each key is a feed, or a folder holding more of the same.
export type RawRSSTree = { [name: string]: RawFeed | RawRSSTree }

export interface FlatFeed {
  feed: RSSFeed
  articles: RSSItem[]
}

const isFeed = (node: RawFeed | RawRSSTree): node is RawFeed =>
  typeof (node as RawFeed).uid === 'string' && typeof (node as RawFeed).url === 'string'

export function flattenRSSTree(tree: RawRSSTree, parent = ''): FlatFeed[] {
  return Object.entries(tree).flatMap(([name, node]) => {
    // qBittorrent separates item paths with a backslash.
    const path = parent ? `${parent}\\${name}` : name
    if (!isFeed(node)) return flattenRSSTree(node, path)

    const articles = node.articles ?? []
    return [{
      feed: {
        uid: node.uid,
        path,
        url: node.url,
        title: node.title || name,
        unreadCount: articles.filter(article => !article.isRead).length,
        hasError: !!node.hasError,
        lastBuildDate: node.lastBuildDate,
      },
      articles: articles.map(article => ({
        id: article.id,
        feedUID: node.uid,
        title: article.title,
        url: article.link || article.torrentURL || '',
        author: article.author,
        date: article.date,
        description: article.description,
        isRead: !!article.isRead,
      })),
    }]
  })
}
