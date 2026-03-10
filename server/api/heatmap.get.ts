import { drizzle } from 'drizzle-orm/d1'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { politicians, electorates, votes, stories, storyPoliticians } from '../database/schema'

export default defineEventHandler(async (event) => {
  const db = drizzle(event.context.cloudflare.env.DB)

  // Check cache (uses Cloudflare Cache API — free, no daily limits)
  const cacheKey = 'heatmap:data'
  const cached = await getCached<any[]>(cacheKey)
  if (cached) return cached

  // Fetch all current House members with their electorate and approval data
  const rows = await db
    .select({
      electorateId: electorates.id,
      electorateName: electorates.name,
      state: electorates.state,
      politicianId: politicians.id,
      politicianName: politicians.name,
      party: politicians.party,
      passCount: sql<number>`coalesce((
        select count(*) from votes
        inner join stories on votes.cluster_id = stories.cluster_id
        inner join story_politicians on story_politicians.story_id = stories.id
        where story_politicians.politician_id = ${politicians.id}
        and votes.vote = 'pass'
      ), 0)`,
      totalVotes: sql<number>`coalesce((
        select count(*) from votes
        inner join stories on votes.cluster_id = stories.cluster_id
        inner join story_politicians on story_politicians.story_id = stories.id
        where story_politicians.politician_id = ${politicians.id}
      ), 0)`,
    })
    .from(politicians)
    .innerJoin(electorates, eq(politicians.electorateId, electorates.id))
    .where(
      and(
        eq(politicians.chamber, 'house'),
        eq(politicians.status, 'current'),
        isNull(electorates.endDate),
      ),
    )

  const result = rows.map(row => ({
    electorateId: row.electorateId,
    electorateName: row.electorateName,
    state: row.state,
    politicianId: row.politicianId,
    politicianName: row.politicianName,
    party: row.party,
    approvalPct: row.totalVotes > 0 ? Math.round((row.passCount / row.totalVotes) * 100) : null,
  }))

  // Cache for 60 minutes (Cloudflare Cache API)
  await setCached(cacheKey, result, 3600)

  return result
})
