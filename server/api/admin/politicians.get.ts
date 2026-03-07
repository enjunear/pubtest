import { eq } from 'drizzle-orm'
import { politicians, electorates } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const { db } = await requireAdmin(event)

  const results = await db
    .select({
      id: politicians.id,
      name: politicians.name,
      displayName: politicians.displayName,
      party: politicians.party,
      chamber: politicians.chamber,
      electorateId: politicians.electorateId,
      electorateName: electorates.name,
      state: politicians.state,
      photoUrl: politicians.photoUrl,
      status: politicians.status,
      enteredParliament: politicians.enteredParliament,
    })
    .from(politicians)
    .leftJoin(electorates, eq(politicians.electorateId, electorates.id))
    .orderBy(politicians.name)

  return { politicians: results }
})
