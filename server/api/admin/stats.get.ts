import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { db } = await requireAdmin(event)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayTs = Math.floor(todayStart.getTime() / 1000)

  const [stats] = await db.all(sql`
    SELECT
      (SELECT COUNT(*) FROM stories WHERE submitted_at >= ${todayTs}) as storiesToday,
      (SELECT COUNT(*) FROM votes WHERE created_at >= ${todayTs}) as votesToday,
      (SELECT COUNT(*) FROM user_profiles WHERE created_at >= ${todayTs}) as usersToday,
      (SELECT COUNT(*) FROM rss_feeds WHERE status = 'active') as activeFeeds,
      (SELECT COUNT(*) FROM rss_feeds WHERE status = 'error') as errorFeeds,
      (SELECT COUNT(*) FROM stories WHERE status = 'moderation') as pendingStories,
      (SELECT COUNT(*) FROM stories) as totalStories,
      (SELECT COUNT(*) FROM votes) as totalVotes,
      (SELECT COUNT(*) FROM user_profiles) as totalUsers,
      (SELECT COUNT(*) FROM politicians WHERE status = 'current') as totalPoliticians
  `)

  return stats
})
