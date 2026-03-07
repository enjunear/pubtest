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

  // Get active stories — one per cluster (primary stories only)
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
      storyCount: storyClusters.storyCount,
      passCount: sql<number>`coalesce((select count(*) from votes where votes.cluster_id = ${stories.clusterId} and votes.vote = 'pass'), 0)`,
      failCount: sql<number>`coalesce((select count(*) from votes where votes.cluster_id = ${stories.clusterId} and votes.vote = 'fail'), 0)`,
    })
    .from(stories)
    .innerJoin(storyClusters, eq(stories.clusterId, storyClusters.id))
    .leftJoin(sources, eq(stories.sourceId, sources.id))
    .where(
      and(
        eq(stories.status, 'active'),
        eq(storyClusters.primaryStoryId, stories.id),
      ),
    )
    .orderBy(
      sort === 'hot'
        ? desc(sql`coalesce(log(max((select count(*) from votes where votes.cluster_id = ${stories.clusterId}), 1))) + (julianday(${stories.submittedAt}) - julianday('now')) * 24 / -12`)
        : sort === 'most-voted'
          ? desc(sql`(select count(*) from votes where votes.cluster_id = ${stories.clusterId})`)
          : desc(stories.submittedAt),
    )
    .limit(limit)
    .offset(offset)

  // Get linked politicians for these stories' clusters
  const clusterIds = [...new Set(storyRows.map(s => s.clusterId).filter(Boolean))] as number[]

  // Get all story IDs in these clusters (for politician union)
  let allClusterStoryIds: number[] = []
  if (clusterIds.length > 0) {
    const clusterStoryRows = await db
      .select({ id: stories.id })
      .from(stories)
      .where(inArray(stories.clusterId, clusterIds))
    allClusterStoryIds = clusterStoryRows.map(s => s.id)
  }

  let pollyLinks: { storyId: number, politicianId: number, name: string, party: string, photoUrl: string | null }[] = []
  if (allClusterStoryIds.length > 0) {
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
      .where(inArray(storyPoliticians.storyId, allClusterStoryIds))
  }

  // Build cluster → story IDs map for politician union
  let clusterStoryMap = new Map<number, number[]>()
  if (clusterIds.length > 0) {
    const clusterStoryRows = await db
      .select({ id: stories.id, clusterId: stories.clusterId })
      .from(stories)
      .where(inArray(stories.clusterId, clusterIds))
    for (const row of clusterStoryRows) {
      if (!row.clusterId) continue
      const existing = clusterStoryMap.get(row.clusterId) ?? []
      existing.push(row.id)
      clusterStoryMap.set(row.clusterId, existing)
    }
  }

  // Fetch other sources for multi-story clusters
  const multiClusterIds = storyRows.filter(s => (s.storyCount ?? 1) > 1).map(s => s.clusterId).filter(Boolean) as number[]
  let otherSourcesMap = new Map<number, Array<{ id: number, headline: string, url: string, source: { name: string | null, domain: string | null } | null }>>()

  if (multiClusterIds.length > 0) {
    const primaryStoryIds = new Set(storyRows.map(s => s.id))
    const otherStories = await db
      .select({
        id: stories.id,
        headline: stories.headline,
        url: stories.url,
        clusterId: stories.clusterId,
        sourceName: sources.name,
        sourceDomain: sources.domain,
      })
      .from(stories)
      .leftJoin(sources, eq(stories.sourceId, sources.id))
      .where(
        and(
          inArray(stories.clusterId, multiClusterIds),
          eq(stories.status, 'active'),
        ),
      )

    for (const s of otherStories) {
      if (primaryStoryIds.has(s.id) || !s.clusterId) continue
      const existing = otherSourcesMap.get(s.clusterId) ?? []
      existing.push({
        id: s.id,
        headline: s.headline,
        url: s.url,
        source: s.sourceName ? { name: s.sourceName, domain: s.sourceDomain } : null,
      })
      otherSourcesMap.set(s.clusterId, existing)
    }
  }

  // Filter by party/chamber/state via linked politicians
  let filteredStoryIds: Set<number> | null = null
  if (query.party || query.chamber || query.state) {
    const matchingPollies = pollyLinks.filter((p) => {
      if (query.party && !p.party.toLowerCase().includes(query.party.toLowerCase())) return false
      return true
    })
    // Find which primary stories have matching politicians in their cluster
    const matchingStoryIds = new Set(matchingPollies.map(p => p.storyId))
    filteredStoryIds = new Set<number>()
    for (const story of storyRows) {
      const clusterStoryIds = story.clusterId ? clusterStoryMap.get(story.clusterId) ?? [story.id] : [story.id]
      if (clusterStoryIds.some(id => matchingStoryIds.has(id))) {
        filteredStoryIds.add(story.id)
      }
    }
  }

  // Build response — union politicians across all stories in cluster
  const result = storyRows
    .filter(s => !filteredStoryIds || filteredStoryIds.has(s.id))
    .map((story) => {
      const clusterStoryIds = story.clusterId ? clusterStoryMap.get(story.clusterId) ?? [story.id] : [story.id]

      // Deduplicate politicians across all stories in cluster
      const seenPollyIds = new Set<number>()
      const clusterPoliticians: { id: number, name: string, party: string, photoUrl: string | null }[] = []
      for (const sid of clusterStoryIds) {
        for (const p of pollyLinks.filter(pl => pl.storyId === sid)) {
          if (!seenPollyIds.has(p.politicianId)) {
            seenPollyIds.add(p.politicianId)
            clusterPoliticians.push({
              id: p.politicianId,
              name: p.name,
              party: p.party,
              photoUrl: p.photoUrl,
            })
          }
        }
      }

      return {
        id: story.id,
        url: story.url,
        headline: story.headline,
        description: story.description,
        thumbnailUrl: story.thumbnailUrl,
        publishedAt: story.publishedAt,
        submittedAt: story.submittedAt,
        clusterId: story.clusterId,
        storyCount: story.storyCount ?? 1,
        source: story.sourceName ? { name: story.sourceName, domain: story.sourceDomain } : null,
        passCount: story.passCount,
        failCount: story.failCount,
        totalVotes: story.passCount + story.failCount,
        politicians: clusterPoliticians,
        otherSources: otherSourcesMap.get(story.clusterId!) ?? [],
      }
    })

  return {
    stories: result,
    page,
    hasMore: storyRows.length === limit,
  }
})
