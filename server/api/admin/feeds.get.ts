import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { rssFeeds, sources } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401 })

  const profile = await getUserProfile(event, session.user.id)
  if (!profile?.isAdmin) throw createError({ statusCode: 403 })

  const db = drizzle(event.context.cloudflare.env.DB)

  const feeds = await db
    .select({
      id: rssFeeds.id,
      feedUrl: rssFeeds.feedUrl,
      category: rssFeeds.category,
      pollIntervalMins: rssFeeds.pollIntervalMins,
      lastPolledAt: rssFeeds.lastPolledAt,
      status: rssFeeds.status,
      errorCount: rssFeeds.errorCount,
      sourceName: sources.name,
      sourceDomain: sources.domain,
    })
    .from(rssFeeds)
    .innerJoin(sources, eq(rssFeeds.sourceId, sources.id))
    .orderBy(sources.name)

  return feeds
})
