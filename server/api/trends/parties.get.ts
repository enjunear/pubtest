import { drizzle } from 'drizzle-orm/d1'
import { gte, sql } from 'drizzle-orm'
import { pollyDailyStats, politicians } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const db = drizzle(event.context.cloudflare.env.DB)

  const query = getQuery(event) as { period?: string }
  const period = query.period || '90d'

  // Calculate start date
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
  const cacheKey = `trends:parties:${period}`
  const cached = await getCached<unknown>(cacheKey)
  if (cached) return cached

  // Build date filter
  const dateFilter = startDate ? `AND s.date >= '${startDate}'` : ''

  // Get party averages grouped by date
  const rows = await db.all(sql.raw(`
    SELECT
      s.date,
      p.party,
      ROUND(AVG(s.approval_pct), 1) as avgApproval,
      SUM(s.total_votes) as totalVotes,
      COUNT(s.politician_id) as politicianCount
    FROM polly_daily_stats s
    INNER JOIN politicians p ON s.politician_id = p.id
    WHERE s.approval_pct IS NOT NULL
      AND s.total_votes >= 1
      ${dateFilter}
    GROUP BY s.date, p.party
    ORDER BY s.date ASC, p.party ASC
  `))

  // Also compute overall "parliament mood" per date
  const overallRows = await db.all(sql.raw(`
    SELECT
      s.date,
      ROUND(AVG(s.approval_pct), 1) as avgApproval,
      SUM(s.total_votes) as totalVotes,
      COUNT(s.politician_id) as politicianCount
    FROM polly_daily_stats s
    WHERE s.approval_pct IS NOT NULL
      AND s.total_votes >= 1
      ${dateFilter}
    GROUP BY s.date
    ORDER BY s.date ASC
  `))

  const response = {
    period,
    partyTrends: rows,
    overallTrend: overallRows,
  }

  // Cache for 2 hours
  await setCached(cacheKey, response, 7200)

  return response
})
