import { drizzle } from 'drizzle-orm/d1'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { politicians, electorates, votes, stories, storyPoliticians } from '../database/schema'

export default defineEventHandler(async (event) => {
  const db = drizzle(event.context.cloudflare.env.DB)
  const kv = event.context.cloudflare.env.RATE_LIMIT

  // Check KV cache
  const cacheKey = 'heatmap:data'
  const cached = await kv.get(cacheKey)
  if (cached) return JSON.parse(cached)

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

  // Cache for 10 minutes
  await kv.put(cacheKey, JSON.stringify(result), { expirationTtl: 600 })

  return result
})
