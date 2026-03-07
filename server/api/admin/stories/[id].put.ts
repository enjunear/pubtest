import { eq } from 'drizzle-orm'
import { stories, adminLog } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const { session, db } = await requireAdmin(event)

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, message: 'Invalid story ID' })

  const body = await readBody<{ status: 'active' | 'rejected' | 'archived' }>(event)

  if (!['active', 'rejected', 'archived'].includes(body.status)) {
    throw createError({ statusCode: 400, message: 'Invalid status' })
  }

  await db.update(stories).set({ status: body.status }).where(eq(stories.id, id))

  await db.insert(adminLog).values({
    adminId: session.user.id,
    action: `story_${body.status}`,
    targetType: 'story',
    targetId: String(id),
    timestamp: new Date(),
  })

  return { ok: true }
})
