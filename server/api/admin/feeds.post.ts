import { drizzle } from 'drizzle-orm/d1'
import { rssFeeds } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401 })

  const profile = await getUserProfile(event, session.user.id)
  if (!profile?.isAdmin) throw createError({ statusCode: 403 })

  const body = await readBody<{
    sourceId: number
    feedUrl: string
    category?: string
    pollIntervalMins?: number
  }>(event)

  if (!body.sourceId || !body.feedUrl) {
    throw createError({ statusCode: 400, message: 'sourceId and feedUrl required' })
  }

  const db = drizzle(event.context.cloudflare.env.DB)

  const [feed] = await db
    .insert(rssFeeds)
    .values({
      sourceId: body.sourceId,
      feedUrl: body.feedUrl,
      category: body.category,
      pollIntervalMins: body.pollIntervalMins || 15,
      createdAt: new Date(),
    })
    .returning()

  return feed
})
