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
  const userId = session.user.id

  // Check account age for rate limit tier
  const profile = await getUserProfile(event, userId)
  const accountAgeHours = profile
    ? (Date.now() - new Date(profile.createdAt).getTime()) / 3600000
    : 0

  // New accounts (<24hrs): max 10 votes per day
  if (accountAgeHours < 24) {
    const dailyCheck = await checkRateLimit(event, 'vote-new', userId, 10, 86400)
    if (!dailyCheck.allowed) {
      throw createError({
        statusCode: 429,
        message: 'New accounts are limited to 10 votes per day. Try again tomorrow.',
        data: { retryAfter: dailyCheck.retryAfter },
      })
    }
  }

  // All accounts: max 50 votes per hour
  const rateCheck = await checkRateLimit(event, 'vote', userId, 50, 3600)

  if (!rateCheck.allowed) {
    throw createError({
      statusCode: 429,
      message: 'Vote rate limit exceeded. Try again later.',
      data: { retryAfter: rateCheck.retryAfter },
    })
  }

  const now = new Date()
  const ip = getRequestIP(event) || 'unknown'
  const ipHashed = hashIP(ip)

  // Check for existing vote
  const [existing] = await db
    .select({ id: votes.id, vote: votes.vote })
    .from(votes)
    .where(and(eq(votes.userId, userId), eq(votes.clusterId, body.clusterId)))
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
      .set({ vote: body.vote, ipHash: ipHashed, updatedAt: now })
      .where(eq(votes.id, existing.id))
    return { action: 'changed', vote: body.vote }
  }

  // Cast new vote
  await db.insert(votes).values({
    userId,
    clusterId: body.clusterId,
    vote: body.vote,
    ipHash: ipHashed,
    createdAt: now,
    updatedAt: now,
  })

  return { action: 'voted', vote: body.vote }
})
