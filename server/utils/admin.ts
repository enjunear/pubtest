import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'

export async function requireAdmin(event: H3Event) {
  const session = await getAuthSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const profile = await getUserProfile(event, session.user.id)
  if (!profile?.isAdmin) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const db = drizzle(event.context.cloudflare.env.DB)
  return { session, profile, db }
}
