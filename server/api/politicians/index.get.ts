import { drizzle } from 'drizzle-orm/d1'
import { eq, sql, and, like } from 'drizzle-orm'
import { politicians, electorates, votes, stories, storyPoliticians } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const db = drizzle(event.context.cloudflare.env.DB)

  const query = getQuery(event) as {
    party?: string
    chamber?: string
    state?: string
    search?: string
    sort?: string
    page?: string
    limit?: string
  }

  const page = Math.max(1, parseInt(query.page || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '50')))
  const offset = (page - 1) * limit
  const sort = query.sort || 'name'

  // Check cache for the full list (uses Cloudflare Cache API — free, no daily limits)
  const isDefaultRequest = !query.party && !query.chamber && !query.state && !query.search && sort === 'name' && page === 1 && limit === 50
  const cacheKey = 'politicians:list'
  if (isDefaultRequest) {
    const cached = await getCached<{ politicians: any[], page: number, hasMore: boolean }>(cacheKey)
    if (cached) return cached
  }

  // Build WHERE conditions
  const conditions = [eq(politicians.status, 'current')]
  if (query.party) conditions.push(eq(politicians.party, query.party))
  if (query.chamber) conditions.push(eq(politicians.chamber, query.chamber))
  if (query.state) conditions.push(eq(politicians.state, query.state))
  if (query.search) conditions.push(like(politicians.name, `%${query.search}%`))

  const where = conditions.length === 1 ? conditions[0] : and(...conditions)

  // Fetch politicians with approval data in a single query
  const rows = await db
    .select({
      id: politicians.id,
      name: politicians.name,
      displayName: politicians.displayName,
      party: politicians.party,
      chamber: politicians.chamber,
      electorateId: politicians.electorateId,
      state: politicians.state,
      photoUrl: politicians.photoUrl,
      electorateName: electorates.name,
      passCount: sql<number>`coalesce((
        select count(*) from votes
        inner join stories on votes.cluster_id = stories.cluster_id
        inner join story_politicians on story_politicians.story_id = stories.id
        where story_politicians.politician_id = ${politicians.id}
        and votes.vote = 'pass'
      ), 0)`,
      failCount: sql<number>`coalesce((
        select count(*) from votes
        inner join stories on votes.cluster_id = stories.cluster_id
        inner join story_politicians on story_politicians.story_id = stories.id
        where story_politicians.politician_id = ${politicians.id}
        and votes.vote = 'fail'
      ), 0)`,
      totalVotes: sql<number>`coalesce((
        select count(*) from votes
        inner join stories on votes.cluster_id = stories.cluster_id
        inner join story_politicians on story_politicians.story_id = stories.id
        where story_politicians.politician_id = ${politicians.id}
      ), 0)`,
    })
    .from(politicians)
    .leftJoin(electorates, eq(politicians.electorateId, electorates.id))
    .where(where!)
    .orderBy(
      sort === 'approval'
        ? sql`case when coalesce((
            select count(*) from votes
            inner join stories on votes.cluster_id = stories.cluster_id
            inner join story_politicians on story_politicians.story_id = stories.id
            where story_politicians.politician_id = ${politicians.id}
          ), 0) = 0 then -1 else cast(coalesce((
            select count(*) from votes
            inner join stories on votes.cluster_id = stories.cluster_id
            inner join story_politicians on story_politicians.story_id = stories.id
            where story_politicians.politician_id = ${politicians.id}
            and votes.vote = 'pass'
          ), 0) as real) / coalesce((
            select count(*) from votes
            inner join stories on votes.cluster_id = stories.cluster_id
            inner join story_politicians on story_politicians.story_id = stories.id
            where story_politicians.politician_id = ${politicians.id}
          ), 1) end desc`
        : sort === 'most-voted'
          ? sql`coalesce((
              select count(*) from votes
              inner join stories on votes.cluster_id = stories.cluster_id
              inner join story_politicians on story_politicians.story_id = stories.id
              where story_politicians.politician_id = ${politicians.id}
            ), 0) desc`
          : sql`${politicians.name} asc`,
    )
    .limit(limit)
    .offset(offset)

  const result = rows.map(row => ({
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    party: row.party,
    chamber: row.chamber,
    state: row.state,
    photoUrl: row.photoUrl,
    electorateId: row.electorateId,
    electorateName: row.electorateName,
    passCount: row.passCount,
    failCount: row.failCount,
    totalVotes: row.totalVotes,
    approvalPct: row.totalVotes > 0 ? Math.round((row.passCount / row.totalVotes) * 100) : null,
  }))

  const response = { politicians: result, page, hasMore: rows.length === limit }

  // Cache default request for 30 minutes (Cloudflare Cache API)
  if (isDefaultRequest) {
    await setCached(cacheKey, response, 1800)
  }

  return response
})
