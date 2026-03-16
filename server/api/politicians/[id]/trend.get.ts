import { drizzle } from 'drizzle-orm/d1'
import { eq, and, gte, desc } from 'drizzle-orm'
import { pollyDailyStats, politicians } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid politician ID' })

  const db = drizzle(event.context.cloudflare.env.DB)

  const query = getQuery(event) as { period?: string }
  const period = query.period || '30d'

  // Calculate start date based on period
  const now = new Date()
  let startDate: string | null = null

  switch (period) {
    case '30d':
      now.setDate(now.getDate() - 30)
      startDate = now.toISOString().slice(0, 10)
      break
    case '90d':
      now.setDate(now.getDate() - 90)
      startDate = now.toISOString().slice(0, 10)
      break
    case '1y':
      now.setFullYear(now.getFullYear() - 1)
      startDate = now.toISOString().slice(0, 10)
      break
    case 'all':
      startDate = null
      break
    default:
      throw createError({ statusCode: 400, message: 'Invalid period. Use 30d, 90d, 1y, or all' })
  }

  // Check cache
  const cacheKey = `trend:${id}:${period}`
  const cached = await getCached<{ politicianId: number, period: string, data: unknown[] }>(cacheKey)
  if (cached) return cached

  // Verify politician exists
  const [polly] = await db
    .select({ id: politicians.id })
    .from(politicians)
    .where(eq(politicians.id, id))
    .limit(1)

  if (!polly) {
    throw createError({ statusCode: 404, message: 'Politician not found' })
  }

  // Fetch trend data
  const conditions = [eq(pollyDailyStats.politicianId, id)]
  if (startDate) {
    conditions.push(gte(pollyDailyStats.date, startDate))
  }

  const rows = await db
    .select({
      date: pollyDailyStats.date,
      approvalPct: pollyDailyStats.approvalPct,
      totalVotes: pollyDailyStats.totalVotes,
      passCount: pollyDailyStats.passCount,
      failCount: pollyDailyStats.failCount,
    })
    .from(pollyDailyStats)
    .where(and(...conditions))
    .orderBy(pollyDailyStats.date)

  const response = {
    politicianId: id,
    period,
    data: rows,
  }

  // Cache for 1 hour
  await setCached(cacheKey, response, 3600)

  return response
})
