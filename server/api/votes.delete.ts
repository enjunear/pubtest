import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { votes } from '../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const body = await readBody<{ clusterId: number }>(event)

  if (!body.clusterId) {
    throw createError({ statusCode: 400, message: 'clusterId is required' })
  }

  const db = drizzle(event.context.cloudflare.env.DB)

  const deleted = await db
    .delete(votes)
    .where(and(eq(votes.userId, session.user.id), eq(votes.clusterId, body.clusterId)))

  return { action: 'removed' }
})
