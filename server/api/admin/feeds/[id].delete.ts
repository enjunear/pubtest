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

  const db = drizzle(event.context.cloudflare.env.DB)
  await db.delete(rssFeeds).where(eq(rssFeeds.id, id))

  return { ok: true }
})
