import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, sql, inArray } from 'drizzle-orm'
import { politicians, electorates, storyPoliticians, stories, sources, votes } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid politician ID' })

  const db = drizzle(event.context.cloudflare.env.DB)

  const query = getQuery(event) as {
    page?: string
    limit?: string
  }

  const page = Math.max(1, parseInt(query.page || '1'))
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20')))
  const offset = (page - 1) * limit

  // Fetch politician with electorate info
  const [polly] = await db
    .select({
      id: politicians.id,
      name: politicians.name,
      displayName: politicians.displayName,
      party: politicians.party,
      chamber: politicians.chamber,
      electorateId: politicians.electorateId,
      state: politicians.state,
      photoUrl: politicians.photoUrl,
      status: politicians.status,
      enteredParliament: politicians.enteredParliament,
      electorateName: electorates.name,
    })
    .from(politicians)
    .leftJoin(electorates, eq(politicians.electorateId, electorates.id))
    .where(eq(politicians.id, id))
    .limit(1)

  if (!polly) throw createError({ statusCode: 404, message: 'Politician not found' })

  // Fetch linked stories with vote counts, sorted by recency
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
    .from(storyPoliticians)
    .innerJoin(stories, eq(storyPoliticians.storyId, stories.id))
    .leftJoin(sources, eq(stories.sourceId, sources.id))
    .where(eq(storyPoliticians.politicianId, id))
    .orderBy(desc(stories.submittedAt))
    .limit(limit)
    .offset(offset)

  // Get all politicians linked to these stories (for StoryCard display)
  const storyIds = storyRows.map(s => s.id)
  let pollyLinks: { storyId: number; politicianId: number; name: string; party: string; photoUrl: string | null }[] = []
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

  const linkedStories = storyRows.map(story => ({
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
      .map(p => ({ id: p.politicianId, name: p.name, party: p.party, photoUrl: p.photoUrl })),
  }))

  return {
    politician: polly,
    stories: linkedStories,
    page,
    hasMore: storyRows.length === limit,
  }
})
