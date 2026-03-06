import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { userProfiles, user as userTable } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const db = drizzle(event.context.cloudflare.env.DB)

  // Soft-delete: update profile status, clear personal data
  await db
    .update(userProfiles)
    .set({ status: 'banned', electorateId: null })
    .where(eq(userProfiles.userId, session.user.id))

  // Anonymise the user record
  await db
    .update(userTable)
    .set({
      name: 'Deleted User',
      email: `deleted-${session.user.id}@deleted.local`,
      image: null,
    })
    .where(eq(userTable.id, session.user.id))

  return { ok: true }
})
