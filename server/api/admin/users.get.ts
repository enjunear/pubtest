import { sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const { db } = await requireAdmin(event)

  const query = getQuery(event)
  const status = query.status as string | undefined
  const search = query.search as string | undefined
  const page = Number(query.page) || 1
  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = (page - 1) * limit

  const users = await db.all(sql`
    SELECT
      u.id, u.name, u.email, u.created_at as createdAt,
      up.electorate_id as electorateId, up.is_admin as isAdmin,
      up.status, up.created_at as profileCreatedAt,
      e.name as electorateName, e.state as electorateState,
      (SELECT COUNT(*) FROM votes v WHERE v.user_id = u.id) as voteCount
    FROM user u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN electorates e ON e.id = up.electorate_id
    WHERE 1=1
    ${status ? sql`AND up.status = ${status}` : sql``}
    ${search ? sql`AND (u.name LIKE ${'%' + search + '%'} OR u.email LIKE ${'%' + search + '%'})` : sql``}
    ORDER BY u.created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `)

  return { users }
})
