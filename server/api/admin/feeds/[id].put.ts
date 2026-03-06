import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { rssFeeds } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) throw createError({ statusCode: 401 })

  const profile = await getUserProfile(event, session.user.id)
  if (!profile?.isAdmin) throw createError({ statusCode: 403 })

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid feed ID' })

  const body = await readBody<{
    feedUrl?: string
    category?: string
    pollIntervalMins?: number
    status?: 'active' | 'paused' | 'error'
  }>(event)

  const db = drizzle(event.context.cloudflare.env.DB)

  const updates: Record<string, unknown> = {}
  if (body.feedUrl) updates.feedUrl = body.feedUrl
  if (body.category !== undefined) updates.category = body.category
  if (body.pollIntervalMins) updates.pollIntervalMins = body.pollIntervalMins
  if (body.status) {
    updates.status = body.status
    if (body.status === 'active') updates.errorCount = 0
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No updates provided' })
  }

  await db.update(rssFeeds).set(updates).where(eq(rssFeeds.id, id))

  return { ok: true }
})
