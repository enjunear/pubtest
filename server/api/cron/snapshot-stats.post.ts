import { drizzle } from 'drizzle-orm/d1'
import { eq, sql } from 'drizzle-orm'
import { politicians, pollyDailyStats, votes, stories, storyPoliticians } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const db = drizzle(event.context.cloudflare.env.DB)

  // Today's date in YYYY-MM-DD format (UTC)
  const today = new Date().toISOString().slice(0, 10)

  // Get all current politicians
  const allPollies = await db
    .select({ id: politicians.id })
    .from(politicians)
    .where(eq(politicians.status, 'current'))

  let snapshotCount = 0

  for (const polly of allPollies) {
    // Aggregate votes across all stories linked to this politician
    const [result] = await db
      .select({
        passCount: sql<number>`coalesce(sum(case when ${votes.vote} = 'pass' then 1 else 0 end), 0)`,
        failCount: sql<number>`coalesce(sum(case when ${votes.vote} = 'fail' then 1 else 0 end), 0)`,
        totalVotes: sql<number>`count(${votes.id})`,
      })
      .from(votes)
      .innerJoin(stories, eq(votes.clusterId, stories.clusterId))
      .innerJoin(storyPoliticians, eq(storyPoliticians.storyId, stories.id))
      .where(eq(storyPoliticians.politicianId, polly.id))

    const passCount = result?.passCount || 0
    const failCount = result?.failCount || 0
    const totalVotes = result?.totalVotes || 0
    const approvalPct = totalVotes > 0 ? Math.round((passCount / totalVotes) * 100) : null

    // Upsert: insert or replace if already snapshotted today
    await db
      .insert(pollyDailyStats)
      .values({
        politicianId: polly.id,
        date: today,
        approvalPct,
        totalVotes,
        passCount,
        failCount,
      })
      .onConflictDoUpdate({
        target: [pollyDailyStats.politicianId, pollyDailyStats.date],
        set: {
          approvalPct,
          totalVotes,
          passCount,
          failCount,
        },
      })

    snapshotCount++
  }

  return {
    date: today,
    politiciansSnapshotted: snapshotCount,
  }
})
