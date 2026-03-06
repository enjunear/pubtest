import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { userProfiles, electorates } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const body = await readBody<{ electorateId: number }>(event)
  if (!body.electorateId || typeof body.electorateId !== 'number') {
    throw createError({ statusCode: 400, message: 'Invalid electorate' })
  }

  const db = drizzle(event.context.cloudflare.env.DB)

  const [electorate] = await db
    .select({ id: electorates.id })
    .from(electorates)
    .where(eq(electorates.id, body.electorateId))
    .limit(1)

  if (!electorate) {
    throw createError({ statusCode: 400, message: 'Electorate not found' })
  }

  await db
    .update(userProfiles)
    .set({ electorateId: body.electorateId })
    .where(eq(userProfiles.userId, session.user.id))

  return { ok: true }
})
