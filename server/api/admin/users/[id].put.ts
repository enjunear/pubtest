import { eq } from 'drizzle-orm'
import { userProfiles, adminLog } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const { session, db } = await requireAdmin(event)

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Invalid user ID' })

  const body = await readBody<{
    status?: 'active' | 'suspended' | 'banned'
  }>(event)

  if (!body.status || !['active', 'suspended', 'banned'].includes(body.status)) {
    throw createError({ statusCode: 400, message: 'Valid status required' })
  }

  await db.update(userProfiles).set({ status: body.status }).where(eq(userProfiles.userId, id))

  await db.insert(adminLog).values({
    adminId: session.user.id,
    action: `user_${body.status}`,
    targetType: 'user',
    targetId: id,
    timestamp: new Date(),
  })

  return { ok: true }
})
