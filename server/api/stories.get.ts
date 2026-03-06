import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, sql, and, inArray } from 'drizzle-orm'
import { stories, storyClusters, sources, storyPoliticians, politicians, votes } from '../database/schema'

export default defineEventHandler(async (event) => {
  const db = drizzle(event.context.cloudflare.env.DB)

  const query = getQuery(event) as {
    sort?: string
    party?: string
    chamber?: string
    state?: string
    page?: string
    limit?: string
  }

  const page = Math.max(1, parseInt(query.page || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20')))
  const offset = (page - 1) * limit
  const sort = query.sort || 'new'

  // Get active stories with source info and vote counts
  const storyRows = await db
    .select({
      id: stories.id,
      url: stories.url,
      headline: stories.headline,
      description: stories.description,
      thumbnailUrl: stories.thumbnailUrl,
      publishedAt: stories.publishedAt,
      submittedAt: stories.submittedAt,
      clusterId: stories.clusterId,
      sourceName: sources.name,
      sourceDomain: sources.domain,
      passCount: sql<number>`coalesce((select count(*) from votes where votes.cluster_id = ${stories.clusterId} and votes.vote = 'pass'), 0)`,
      failCount: sql<number>`coalesce((select count(*) from votes where votes.cluster_id = ${stories.clusterId} and votes.vote = 'fail'), 0)`,
    })
    .from(stories)
    .leftJoin(sources, eq(stories.sourceId, sources.id))
    .where(eq(stories.status, 'active'))
    .orderBy(
      sort === 'hot'
        ? desc(sql`coalesce(log(max((select count(*) from votes where votes.cluster_id = ${stories.clusterId}), 1))) + (julianday(${stories.submittedAt}) - julianday('now')) * 24 / -12`)
        : sort === 'most-voted'
          ? desc(sql`(select count(*) from votes where votes.cluster_id = ${stories.clusterId})`)
          : desc(stories.submittedAt),
    )
    .limit(limit)
    .offset(offset)

  // Get linked politicians for these stories
  const storyIds = storyRows.map(s => s.id)
  let pollyLinks: { storyId: number, politicianId: number, name: string, party: string, photoUrl: string | null }[] = []

  if (storyIds.length > 0) {
    pollyLinks = await db
      .select({
        storyId: storyPoliticians.storyId,
        politicianId: storyPoliticians.politicianId,
        name: politicians.name,
        party: politicians.party,
        photoUrl: politicians.photoUrl,
      })
      .from(storyPoliticians)
      .innerJoin(politicians, eq(storyPoliticians.politicianId, politicians.id))
      .where(inArray(storyPoliticians.storyId, storyIds))
  }

  // Filter by party/chamber/state via linked politicians
  let filteredStoryIds: Set<number> | null = null
  if (query.party || query.chamber || query.state) {
    const matchingPollies = pollyLinks.filter((p) => {
      const polly = pollyLinks.find(pl => pl.politicianId === p.politicianId)
      if (!polly) return false
      if (query.party && !polly.party.toLowerCase().includes(query.party.toLowerCase())) return false
      return true
    })
    filteredStoryIds = new Set(matchingPollies.map(p => p.storyId))
  }

  // Build response
  const result = storyRows
    .filter(s => !filteredStoryIds || filteredStoryIds.has(s.id))
    .map(story => ({
      id: story.id,
      url: story.url,
      headline: story.headline,
      description: story.description,
      thumbnailUrl: story.thumbnailUrl,
      publishedAt: story.publishedAt,
      submittedAt: story.submittedAt,
      clusterId: story.clusterId,
      source: story.sourceName ? { name: story.sourceName, domain: story.sourceDomain } : null,
      passCount: story.passCount,
      failCount: story.failCount,
      totalVotes: story.passCount + story.failCount,
      politicians: pollyLinks
        .filter(p => p.storyId === story.id)
        .map(p => ({
          id: p.politicianId,
          name: p.name,
          party: p.party,
          photoUrl: p.photoUrl,
        })),
    }))

  return {
    stories: result,
    page,
    hasMore: storyRows.length === limit,
  }
})
