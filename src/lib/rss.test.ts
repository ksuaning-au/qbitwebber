import { describe, expect, it } from 'vitest'
import { flattenRSSTree, getRSSParent, joinRSSPath, listRSSFolders } from './rss'

describe('flattenRSSTree', () => {
  const tree = {
    Movies: { uid: 'a', url: 'https://a.test', title: 'Movie feed', articles: [
      { id: '1', title: 'One', link: 'https://a.test/1', isRead: false },
      { id: '2', title: 'Two', torrentURL: 'magnet:?x', isRead: true },
    ] },
    Folder: { Nested: { uid: 'b', url: 'https://b.test' } },
    'https://c.test/rss': { uid: 'c', url: 'https://c.test/rss', title: 'Feed C' },
  }

  it('flattens folders and keeps each feed path', () => {
    const feeds = flattenRSSTree(tree).map(({ feed }) => [feed.uid, feed.path, feed.title])
    expect(feeds).toEqual([['a', 'Movies', 'Movies'], ['b', 'Folder\\Nested', 'Nested'], ['c', 'https://c.test/rss', 'Feed C']])
  })

  it('lists folders, including empty ones', () => {
    expect(listRSSFolders({ ...tree, Empty: {}, Folder: { Nested: tree.Folder.Nested, Inner: {} } })).toEqual(['Folder', 'Folder\\Inner', 'Empty'])
  })

  it('splits and joins item paths', () => {
    expect(getRSSParent('A\\B\\feed')).toBe('A\\B')
    expect(getRSSParent('feed')).toBe('')
    expect(joinRSSPath('', 'feed')).toBe('feed')
    expect(joinRSSPath('A', 'feed')).toBe('A\\feed')
  })
  it('counts unread articles and maps their links', () => {
    const [{ feed, articles }] = flattenRSSTree(tree)
    expect(feed.unreadCount).toBe(1)
    expect(articles.map(article => article.url)).toEqual(['https://a.test/1', 'magnet:?x'])
  })
  it('handles an empty tree', () => expect(flattenRSSTree({})).toEqual([]))
})
