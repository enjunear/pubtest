import { eq, desc } from 'drizzle-orm'
import { stories, sources } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const { db } = await requireAdmin(event)

  const query = getQuery(event)
  const status = query.status as string | undefined
  const page = Number(query.page) || 1
  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = (page - 1) * limit

  const baseQuery = db
    .select({
      id: stories.id,
      url: stories.url,
      headline: stories.headline,
      description: stories.description,
      thumbnailUrl: stories.thumbnailUrl,
      status: stories.status,
      submittedAt: stories.submittedAt,
      submittedBy: stories.submittedBy,
      sourceName: sources.name,
      sourceDomain: sources.domain,
      sourceTier: sources.tier,
    })
    .from(stories)
    .leftJoin(sources, eq(stories.sourceId, sources.id))

  const results = status
    ? await baseQuery.where(eq(stories.status, status as any)).orderBy(desc(stories.submittedAt)).limit(limit).offset(offset)
    : await baseQuery.orderBy(desc(stories.submittedAt)).limit(limit).offset(offset)

  return { stories: results }
})
