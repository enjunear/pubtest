import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { userProfiles } from '../database/schema'
import type { H3Event } from 'h3'

export async function getAuthSession(event: H3Event) {
  const auth = serverAuth(event)
  return auth.api.getSession({ headers: event.headers })
}

export async function getUserProfile(event: H3Event, userId: string) {
  const db = drizzle(event.context.cloudflare.env.DB)
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1)
  return profile || null
}
