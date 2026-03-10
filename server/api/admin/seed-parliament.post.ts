import { drizzle } from 'drizzle-orm/d1'
import { seedParliament } from '../../utils/seed-parliament'

export default defineEventHandler(async (event) => {
  const d1 = event.context.cloudflare.env.DB
  const db = drizzle(d1)
  await seedParliament(db)
  return { ok: true }
})
