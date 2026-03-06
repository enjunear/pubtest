import { drizzle } from 'drizzle-orm/d1'
import { eq, sql } from 'drizzle-orm'
import { stories, sources, storyPoliticians, politicians, votes } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid story ID' })

  const db = drizzle(event.context.cloudflare.env.DB)

  const [story] = await db
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
    })
    .from(stories)
    .leftJoin(sources, eq(stories.sourceId, sources.id))
    .where(eq(stories.id, id))
    .limit(1)

  if (!story) {
    throw createError({ statusCode: 404, message: 'Story not found' })
  }

  // Get linked politicians
  const pollyLinks = await db
    .select({
      id: politicians.id,
      name: politicians.name,
      party: politicians.party,
      chamber: politicians.chamber,
      state: politicians.state,
      photoUrl: politicians.photoUrl,
    })
    .from(storyPoliticians)
    .innerJoin(politicians, eq(storyPoliticians.politicianId, politicians.id))
    .where(eq(storyPoliticians.storyId, id))

  // Get vote counts
  const [voteCounts] = await db
    .select({
      passCount: sql<number>`sum(case when vote = 'pass' then 1 else 0 end)`,
      failCount: sql<number>`sum(case when vote = 'fail' then 1 else 0 end)`,
    })
    .from(votes)
    .where(story.clusterId ? eq(votes.clusterId, story.clusterId) : sql`0`)

  return {
    ...story,
    source: story.sourceName ? { name: story.sourceName, domain: story.sourceDomain } : null,
    politicians: pollyLinks,
    passCount: voteCounts?.passCount || 0,
    failCount: voteCounts?.failCount || 0,
    totalVotes: (voteCounts?.passCount || 0) + (voteCounts?.failCount || 0),
  }
})
