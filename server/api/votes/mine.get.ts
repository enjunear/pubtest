import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { votes } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) return {}

  const db = drizzle(event.context.cloudflare.env.DB)
  const userVotes = await db
    .select({ clusterId: votes.clusterId, vote: votes.vote })
    .from(votes)
    .where(eq(votes.userId, session.user.id))

  const voteMap: Record<number, string> = {}
  for (const v of userVotes) {
    voteMap[v.clusterId] = v.vote
  }
  return voteMap
})
