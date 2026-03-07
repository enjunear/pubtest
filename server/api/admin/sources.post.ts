import { sources, adminLog } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const { session, db } = await requireAdmin(event)

  const body = await readBody<{
    domain: string
    name: string
    tier?: number
  }>(event)

  if (!body.domain || !body.name) {
    throw createError({ statusCode: 400, message: 'domain and name required' })
  }

  const [source] = await db
    .insert(sources)
    .values({
      domain: body.domain,
      name: body.name,
      tier: body.tier || 3,
    })
    .returning()

  await db.insert(adminLog).values({
    adminId: session.user.id,
    action: 'source_created',
    targetType: 'source',
    targetId: String(source.id),
    timestamp: new Date(),
  })

  return source
})
