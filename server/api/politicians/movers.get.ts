import { drizzle } from 'drizzle-orm/d1'
import { eq, and, sql } from 'drizzle-orm'
import { pollyDailyStats, politicians, electorates } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const db = drizzle(event.context.cloudflare.env.DB)

  // Check cache
  const cacheKey = 'politicians:movers'
  const cached = await getCached<{ mostImproved: unknown[], biggestDrop: unknown[] }>(cacheKey)
  if (cached) return cached

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10)

  // Get the most recent stat date for each politician and the stat from ~30 days ago.
  // We need the latest available date (may not be today) and the earliest available
  // date near 30 days ago for comparison.
  const rows = await db.all(sql`
    WITH latest AS (
      SELECT politician_id, approval_pct, total_votes, date,
             ROW_NUMBER() OVER (PARTITION BY politician_id ORDER BY date DESC) as rn
      FROM polly_daily_stats
      WHERE date <= ${todayStr}
    ),
    baseline AS (
      SELECT politician_id, approval_pct, total_votes, date,
             ROW_NUMBER() OVER (PARTITION BY politician_id ORDER BY date ASC) as rn
      FROM polly_daily_stats
      WHERE date >= ${thirtyDaysAgoStr}
    )
    SELECT
      l.politician_id as politicianId,
      p.name,
      p.display_name as displayName,
      p.party,
      p.chamber,
      p.photo_url as photoUrl,
      p.state,
      e.name as electorateName,
      l.approval_pct as currentApproval,
      b.approval_pct as previousApproval,
      l.total_votes as currentVotes,
      (l.approval_pct - b.approval_pct) as change
    FROM latest l
    INNER JOIN baseline b ON l.politician_id = b.politician_id AND b.rn = 1
    INNER JOIN politicians p ON l.politician_id = p.id
    LEFT JOIN electorates e ON p.electorate_id = e.id
    WHERE l.rn = 1
      AND l.total_votes >= 5
      AND b.total_votes >= 5
      AND l.approval_pct IS NOT NULL
      AND b.approval_pct IS NOT NULL
      AND l.date != b.date
    ORDER BY change DESC
  `)

  const movers = (rows as {
    politicianId: number
    name: string
    displayName: string
    party: string
    chamber: string
    photoUrl: string | null
    state: string | null
    electorateName: string | null
    currentApproval: number
    previousApproval: number
    currentVotes: number
    change: number
  }[])

  const mostImproved = movers.filter(m => m.change > 0).slice(0, 5)
  const biggestDrop = movers.filter(m => m.change < 0).reverse().slice(0, 5)

  const response = { mostImproved, biggestDrop }

  // Cache for 2 hours
  await setCached(cacheKey, response, 7200)

  return response
})
