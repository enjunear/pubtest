import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { stories, storyClusters, storyPoliticians, sources } from '../database/schema'
import type { H3Event } from 'h3'

interface CreateStoryInput {
  url: string
  headline: string
  description?: string
  imageUrl?: string
  publishedAt?: Date
  domain: string
  submittedBy?: string
}

interface CreateStoryResult {
  storyId: number
  status: 'created' | 'duplicate' | 'irrelevant' | 'no_pollies'
}

export async function createStory(
  event: H3Event,
  input: CreateStoryInput,
): Promise<CreateStoryResult> {
  const db = drizzle(event.context.cloudflare.env.DB)

  // Check for URL dedup
  const urlHash = await hashUrl(input.url)
  const [existing] = await db
    .select({ id: stories.id })
    .from(stories)
    .where(eq(stories.urlHash, urlHash))
    .limit(1)

  if (existing) {
    return { storyId: existing.id, status: 'duplicate' }
  }

  // AI relevance filter
  const isRelevant = await isArticlePolitical(event, input.headline, input.description)
  if (!isRelevant) {
    return { storyId: 0, status: 'irrelevant' }
  }

  // AI politician extraction
  const politicianIds = await extractPoliticianIds(event, input.headline, input.description)
  if (politicianIds.length === 0) {
    return { storyId: 0, status: 'no_pollies' }
  }

  // Find source by domain
  const [source] = await db
    .select({ id: sources.id, tier: sources.tier })
    .from(sources)
    .where(eq(sources.domain, input.domain))
    .limit(1)

  const status = source && source.tier <= 2 ? 'active' : 'moderation'

  // Create story cluster
  const now = new Date()
  const clusterRows = await db
    .insert(storyClusters)
    .values({ createdAt: now, storyCount: 1 })
    .returning({ id: storyClusters.id })
  const clusterId = clusterRows[0]!.id

  // Create story
  const storyRows = await db
    .insert(stories)
    .values({
      urlHash,
      url: input.url,
      headline: input.headline,
      description: input.description,
      sourceId: source?.id || null,
      publishedAt: input.publishedAt,
      submittedAt: now,
      submittedBy: input.submittedBy,
      thumbnailUrl: input.imageUrl,
      status,
      clusterId,
    })
    .returning({ id: stories.id })
  const storyId = storyRows[0]!.id

  // Update cluster with primary story
  await db
    .update(storyClusters)
    .set({ primaryStoryId: storyId })
    .where(eq(storyClusters.id, clusterId))

  // Link politicians
  for (const politicianId of politicianIds) {
    await db
      .insert(storyPoliticians)
      .values({ storyId, politicianId })
      .onConflictDoNothing()
  }

  console.log(`[Story] Created: "${input.headline}" (${politicianIds.length} pollies, status: ${status})`)

  return { storyId, status: 'created' }
}

async function hashUrl(url: string): Promise<string> {
  const normalized = url.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\/www\./, 'https://')
  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
