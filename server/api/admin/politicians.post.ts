import { politicians, adminLog } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const { session, db } = await requireAdmin(event)

  const body = await readBody<{
    name: string
    displayName: string
    party: string
    chamber: 'house' | 'senate'
    electorateId?: number
    state?: string
    photoUrl?: string
  }>(event)

  if (!body.name || !body.displayName || !body.party || !body.chamber) {
    throw createError({ statusCode: 400, message: 'name, displayName, party, and chamber required' })
  }

  const [politician] = await db
    .insert(politicians)
    .values({
      name: body.name,
      displayName: body.displayName,
      party: body.party,
      chamber: body.chamber,
      electorateId: body.electorateId,
      state: body.state,
      photoUrl: body.photoUrl,
    })
    .returning()

  await db.insert(adminLog).values({
    adminId: session.user.id,
    action: 'politician_created',
    targetType: 'politician',
    targetId: String(politician.id),
    timestamp: new Date(),
  })

  return politician
})
