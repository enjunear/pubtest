import { drizzle } from 'drizzle-orm/d1'
import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const profile = await getUserProfile(event, session.user.id)
  if (!profile?.isAdmin) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }

  const db = drizzle(event.context.cloudflare.env.DB)

  // Find IP hashes used by multiple accounts (potential vote manipulation)
  const ipClusters = await db.all(sql`
    SELECT
      ip_hash,
      COUNT(DISTINCT user_id) as account_count,
      COUNT(*) as vote_count,
      GROUP_CONCAT(DISTINCT user_id) as user_ids
    FROM votes
    WHERE ip_hash IS NOT NULL AND ip_hash != ''
    GROUP BY ip_hash
    HAVING COUNT(DISTINCT user_id) >= 3
    ORDER BY account_count DESC
    LIMIT 50
  `)

  // Find accounts that vote in lockstep (same votes on same clusters)
  const lockstepPairs = await db.all(sql`
    SELECT
      v1.user_id as user_a,
      v2.user_id as user_b,
      COUNT(*) as shared_votes,
      SUM(CASE WHEN v1.vote = v2.vote THEN 1 ELSE 0 END) as matching_votes
    FROM votes v1
    JOIN votes v2 ON v1.cluster_id = v2.cluster_id
      AND v1.user_id < v2.user_id
    GROUP BY v1.user_id, v2.user_id
    HAVING shared_votes >= 5 AND (CAST(matching_votes AS REAL) / shared_votes) >= 0.9
    ORDER BY shared_votes DESC
    LIMIT 50
  `)

  return { ipClusters, lockstepPairs }
})
