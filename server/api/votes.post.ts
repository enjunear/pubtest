import { drizzle } from 'drizzle-orm/d1'
import { eq, and } from 'drizzle-orm'
import { votes } from '../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const body = await readBody<{ clusterId: number, vote: 'pass' | 'fail' }>(event)

  if (!body.clusterId || !['pass', 'fail'].includes(body.vote)) {
    throw createError({ statusCode: 400, message: 'Invalid vote' })
  }

  const db = drizzle(event.context.cloudflare.env.DB)
  const now = new Date()

  // Check for existing vote
  const [existing] = await db
    .select({ id: votes.id, vote: votes.vote })
    .from(votes)
    .where(and(eq(votes.userId, session.user.id), eq(votes.clusterId, body.clusterId)))
    .limit(1)

  if (existing) {
    if (existing.vote === body.vote) {
      // Remove vote (toggle off)
      await db.delete(votes).where(eq(votes.id, existing.id))
      return { action: 'removed' }
    }
    // Change vote
    await db
      .update(votes)
      .set({ vote: body.vote, updatedAt: now })
      .where(eq(votes.id, existing.id))
    return { action: 'changed', vote: body.vote }
  }

  // Cast new vote
  const ipHash = getRequestIP(event) || 'unknown'
  await db.insert(votes).values({
    userId: session.user.id,
    clusterId: body.clusterId,
    vote: body.vote,
    ipHash,
    createdAt: now,
    updatedAt: now,
  })

  return { action: 'voted', vote: body.vote }
})
