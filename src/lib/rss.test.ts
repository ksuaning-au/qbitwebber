import { describe, expect, it } from 'vitest'
import { flattenRSSTree } from './rss'

describe('flattenRSSTree', () => {
  const tree = {
    Movies: { uid: 'a', url: 'https://a.test', title: 'Movie feed', articles: [
      { id: '1', title: 'One', link: 'https://a.test/1', isRead: false },
      { id: '2', title: 'Two', torrentURL: 'magnet:?x', isRead: true },
    ] },
    Folder: { Nested: { uid: 'b', url: 'https://b.test' } },
  }

  it('flattens folders and keeps each feed path', () => {
    const feeds = flattenRSSTree(tree).map(({ feed }) => [feed.uid, feed.path, feed.title])
    expect(feeds).toEqual([['a', 'Movies', 'Movie feed'], ['b', 'Folder\\Nested', 'Nested']])
  })
  it('counts unread articles and maps their links', () => {
    const [{ feed, articles }] = flattenRSSTree(tree)
    expect(feed.unreadCount).toBe(1)
    expect(articles.map(article => article.url)).toEqual(['https://a.test/1', 'magnet:?x'])
  })
  it('handles an empty tree', () => expect(flattenRSSTree({})).toEqual([]))
})
