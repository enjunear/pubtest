export default defineEventHandler(async (event) => {
  // In production, this would be triggered by a Cloudflare Cron Trigger.
  // For now, allow manual triggering for testing.
  const result = await pollAllFeeds(event)
  return result
})
