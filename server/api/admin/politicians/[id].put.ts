import { eq } from 'drizzle-orm'
import { politicians } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const { db } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid politician ID' })

  const body = await readBody<{
    name?: string
    displayName?: string
    party?: string
    chamber?: 'house' | 'senate'
    electorateId?: number | null
    state?: string
    photoUrl?: string
    status?: 'current' | 'former'
  }>(event)

  const updates: Record<string, unknown> = {}
  if (body.name) updates.name = body.name
  if (body.displayName) updates.displayName = body.displayName
  if (body.party) updates.party = body.party
  if (body.chamber) updates.chamber = body.chamber
  if (body.electorateId !== undefined) updates.electorateId = body.electorateId
  if (body.state !== undefined) updates.state = body.state
  if (body.photoUrl !== undefined) updates.photoUrl = body.photoUrl
  if (body.status) updates.status = body.status

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No updates provided' })
  }

  await db.update(politicians).set(updates).where(eq(politicians.id, id))

  return { ok: true }
})
