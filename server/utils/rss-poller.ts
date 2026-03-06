import { drizzle } from 'drizzle-orm/d1'
import { eq, and, lt, or, isNull, sql } from 'drizzle-orm'
import { rssFeeds, sources } from '../database/schema'
import type { H3Event } from 'h3'

const MAX_ERRORS_BEFORE_PAUSE = 5

export async function pollAllFeeds(event: H3Event) {
  const db = drizzle(event.context.cloudflare.env.DB)
  const now = new Date()

  // Get active feeds due for polling
  const feeds = await db
    .select({
      id: rssFeeds.id,
      feedUrl: rssFeeds.feedUrl,
      sourceId: rssFeeds.sourceId,
      lastArticleGuid: rssFeeds.lastArticleGuid,
      pollIntervalMins: rssFeeds.pollIntervalMins,
      errorCount: rssFeeds.errorCount,
    })
    .from(rssFeeds)
    .innerJoin(sources, eq(rssFeeds.sourceId, sources.id))
    .where(
      and(
        eq(rssFeeds.status, 'active'),
        eq(sources.isActive, true),
        or(
          isNull(rssFeeds.lastPolledAt),
          lt(rssFeeds.lastPolledAt, new Date(now.getTime() - 60000)), // At least 1 min since last poll
        ),
      ),
    )

  console.log(`[RSS] Polling ${feeds.length} feeds`)

  let totalNew = 0
  for (const feed of feeds) {
    try {
      const newCount = await pollSingleFeed(event, feed, db)
      totalNew += newCount

      // Reset error count on success
      await db
        .update(rssFeeds)
        .set({
          lastPolledAt: now,
          errorCount: 0,
        })
        .where(eq(rssFeeds.id, feed.id))
    }
    catch (err) {
      console.error(`[RSS] Error polling feed ${feed.feedUrl}:`, err)

      const newErrorCount = feed.errorCount + 1
      await db
        .update(rssFeeds)
        .set({
          lastPolledAt: now,
          errorCount: newErrorCount,
          status: newErrorCount >= MAX_ERRORS_BEFORE_PAUSE ? 'error' : 'active',
        })
        .where(eq(rssFeeds.id, feed.id))
    }
  }

  console.log(`[RSS] Done. ${totalNew} new stories created from ${feeds.length} feeds`)
  return { feedsPolled: feeds.length, newStories: totalNew }
}

async function pollSingleFeed(
  event: H3Event,
  feed: {
    id: number
    feedUrl: string
    sourceId: number
    lastArticleGuid: string | null
    pollIntervalMins: number
    errorCount: number
  },
  db: ReturnType<typeof drizzle>,
): Promise<number> {
  const { items } = await fetchAndParseFeed(feed.feedUrl)

  if (items.length === 0) return 0

  // Find new items (those after the last seen GUID)
  let newItems = items
  if (feed.lastArticleGuid) {
    const lastIdx = items.findIndex(item => item.guid === feed.lastArticleGuid)
    if (lastIdx >= 0) {
      newItems = items.slice(0, lastIdx)
    }
  }

  if (newItems.length === 0) return 0

  // Update last article GUID
  await db
    .update(rssFeeds)
    .set({ lastArticleGuid: items[0]!.guid })
    .where(eq(rssFeeds.id, feed.id))

  // Look up the source domain for story creation
  const [source] = await db
    .select({ domain: sources.domain })
    .from(sources)
    .where(eq(sources.id, feed.sourceId))
    .limit(1)

  let created = 0
  // Process newest first (but limit to avoid overwhelming on first poll)
  const toProcess = newItems.slice(0, 20)

  for (const item of toProcess) {
    try {
      // Use RSS item data directly instead of re-fetching metadata
      const domain = source?.domain ?? new URL(item.url).hostname.replace(/^www\./, '')
      const result = await createStory(event, {
        url: item.url,
        headline: item.title,
        description: item.description,
        domain,
        publishedAt: item.publishedAt,
      })

      if (result.status === 'created') created++
    }
    catch (err) {
      console.error(`[RSS] Error processing item "${item.title}":`, err)
    }
  }

  console.log(`[RSS] Feed ${feed.feedUrl}: ${created} new from ${toProcess.length} items`)
  return created
}
