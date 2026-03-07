import { sources, rssFeeds } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const { db } = await requireAdmin(event)

  const sourceList = await db.select().from(sources).orderBy(sources.name)
  const feedList = await db.select().from(rssFeeds)

  const feedsBySource = new Map<number, typeof feedList>()
  for (const feed of feedList) {
    if (!feedsBySource.has(feed.sourceId)) feedsBySource.set(feed.sourceId, [])
    feedsBySource.get(feed.sourceId)!.push(feed)
  }

  return {
    sources: sourceList.map(s => ({
      ...s,
      feeds: feedsBySource.get(s.id) || [],
    })),
  }
})
