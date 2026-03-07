import { eq } from 'drizzle-orm'
import { sources } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const { db } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid source ID' })

  const body = await readBody<{
    name?: string
    domain?: string
    tier?: number
    isActive?: boolean
  }>(event)

  const updates: Record<string, unknown> = {}
  if (body.name) updates.name = body.name
  if (body.domain) updates.domain = body.domain
  if (body.tier !== undefined) updates.tier = body.tier
  if (body.isActive !== undefined) updates.isActive = body.isActive

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No updates provided' })
  }

  await db.update(sources).set(updates).where(eq(sources.id, id))

  return { ok: true }
})
