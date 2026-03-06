import { drizzle } from 'drizzle-orm/d1'
import { isNull } from 'drizzle-orm'
import { electorates } from '../database/schema'

export default defineEventHandler(async (event) => {
  const db = drizzle(event.context.cloudflare.env.DB)

  const results = await db
    .select({
      id: electorates.id,
      name: electorates.name,
      state: electorates.state,
    })
    .from(electorates)
    .where(isNull(electorates.endDate))
    .orderBy(electorates.name)

  return results
})
