import { drizzle } from 'drizzle-orm/d1'
import { eq, sql } from 'drizzle-orm'
import { votes, storyPoliticians, stories, politicians } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid politician ID' })

  const db = drizzle(event.context.cloudflare.env.DB)

  // Check cache first (uses Cloudflare Cache API — free, no daily limits)
  const cacheKey = `approval:${id}`
  const cached = await getCached<{ politicianId: number, approvalPct: number | null, passCount: number, failCount: number, totalVotes: number }>(cacheKey)
  if (cached) {
    return cached
  }

  // Verify politician exists
  const [polly] = await db
    .select({ id: politicians.id, name: politicians.name })
    .from(politicians)
    .where(eq(politicians.id, id))
    .limit(1)

  if (!polly) {
    throw createError({ statusCode: 404, message: 'Politician not found' })
  }

  // Aggregate votes across all stories linked to this politician
  const [result] = await db
    .select({
      passCount: sql<number>`sum(case when ${votes.vote} = 'pass' then 1 else 0 end)`,
      failCount: sql<number>`sum(case when ${votes.vote} = 'fail' then 1 else 0 end)`,
      totalVotes: sql<number>`count(*)`,
    })
    .from(votes)
    .innerJoin(stories, eq(votes.clusterId, stories.clusterId))
    .innerJoin(storyPoliticians, eq(storyPoliticians.storyId, stories.id))
    .where(eq(storyPoliticians.politicianId, id))

  const passCount = result?.passCount || 0
  const failCount = result?.failCount || 0
  const totalVotes = result?.totalVotes || 0
  const approvalPct = totalVotes > 0 ? Math.round((passCount / totalVotes) * 100) : null

  const response = { politicianId: id, approvalPct, passCount, failCount, totalVotes }

  // Cache for 30 minutes (Cloudflare Cache API)
  await setCached(cacheKey, response, 1800)

  return response
})
