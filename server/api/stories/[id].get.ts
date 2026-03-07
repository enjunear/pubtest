import { drizzle } from 'drizzle-orm/d1'
import { eq, and, ne, sql, inArray } from 'drizzle-orm'
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

  // Get all story IDs in this cluster for politician union
  let clusterStoryIds = [id]
  if (story.clusterId) {
    const clusterRows = await db
      .select({ id: stories.id })
      .from(stories)
      .where(eq(stories.clusterId, story.clusterId))
    clusterStoryIds = clusterRows.map(s => s.id)
  }

  // Get linked politicians across all cluster stories (deduplicated)
  const allPollyLinks = await db
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
    .where(inArray(storyPoliticians.storyId, clusterStoryIds))

  // Deduplicate
  const seenIds = new Set<number>()
  const pollyLinks = allPollyLinks.filter((p) => {
    if (seenIds.has(p.id)) return false
    seenIds.add(p.id)
    return true
  })

  // Get vote counts
  const [voteCounts] = await db
    .select({
      passCount: sql<number>`sum(case when vote = 'pass' then 1 else 0 end)`,
      failCount: sql<number>`sum(case when vote = 'fail' then 1 else 0 end)`,
    })
    .from(votes)
    .where(story.clusterId ? eq(votes.clusterId, story.clusterId) : sql`0`)

  // Get other stories in the same cluster
  let clusterStories: Array<{ id: number, headline: string, url: string, source: { name: string | null, domain: string | null } | null }> = []
  if (story.clusterId) {
    const otherStories = await db
      .select({
        id: stories.id,
        headline: stories.headline,
        url: stories.url,
        sourceName: sources.name,
        sourceDomain: sources.domain,
      })
      .from(stories)
      .leftJoin(sources, eq(stories.sourceId, sources.id))
      .where(
        and(
          eq(stories.clusterId, story.clusterId),
          ne(stories.id, id),
        ),
      )

    clusterStories = otherStories.map(s => ({
      id: s.id,
      headline: s.headline,
      url: s.url,
      source: s.sourceName ? { name: s.sourceName, domain: s.sourceDomain } : null,
    }))
  }

  return {
    ...story,
    source: story.sourceName ? { name: story.sourceName, domain: story.sourceDomain } : null,
    politicians: pollyLinks,
    passCount: voteCounts?.passCount || 0,
    failCount: voteCounts?.failCount || 0,
    totalVotes: (voteCounts?.passCount || 0) + (voteCounts?.failCount || 0),
    clusterStories,
  }
})
