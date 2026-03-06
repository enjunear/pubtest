import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { userProfiles, electorates } from '../database/schema'

export default defineEventHandler(async (event) => {
  const auth = serverAuth()
  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const body = await readBody<{ electorateId: number }>(event)

  if (!body.electorateId || typeof body.electorateId !== 'number') {
    throw createError({ statusCode: 400, message: 'Invalid electorate' })
  }

  const db = drizzle(event.context.cloudflare.env.DB)

  // Verify electorate exists
  const [electorate] = await db
    .select({ id: electorates.id })
    .from(electorates)
    .where(eq(electorates.id, body.electorateId))
    .limit(1)

  if (!electorate) {
    throw createError({ statusCode: 400, message: 'Electorate not found' })
  }

  // Check if profile already exists
  const [existing] = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id))
    .limit(1)

  const now = new Date()

  if (existing) {
    await db
      .update(userProfiles)
      .set({
        electorateId: body.electorateId,
        onboardingComplete: true,
      })
      .where(eq(userProfiles.userId, session.user.id))
  }
  else {
    await db.insert(userProfiles).values({
      userId: session.user.id,
      electorateId: body.electorateId,
      onboardingComplete: true,
      createdAt: now,
      lastActive: now,
    })
  }

  return { ok: true }
})
