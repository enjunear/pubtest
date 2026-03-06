export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)

  if (!session?.user) {
    return { user: null, profile: null }
  }

  const profile = await getUserProfile(event, session.user.id)

  return {
    user: session.user,
    profile,
  }
})
