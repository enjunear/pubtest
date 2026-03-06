export default defineEventHandler(async (event) => {
  const session = await getAuthSession(event)
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Not authenticated' })
  }

  const userId = session.user.id

  // Check account age: must be > 48 hours to submit stories
  const profile = await getUserProfile(event, userId)
  if (profile) {
    const accountAgeHours = (Date.now() - new Date(profile.createdAt).getTime()) / 3600000
    if (accountAgeHours < 48) {
      throw createError({
        statusCode: 403,
        message: 'New accounts must wait 48 hours before submitting stories.',
      })
    }
  }

  // Rate limit: max 10 submissions per 24 hours
  const rateCheck = await checkRateLimit(event, 'submit', userId, 10, 86400)
  if (!rateCheck.allowed) {
    throw createError({
      statusCode: 429,
      message: 'Submission limit reached (10 per day). Try again later.',
      data: { retryAfter: rateCheck.retryAfter },
    })
  }

  const body = await readBody<{ url: string }>(event)
  if (!body.url) {
    throw createError({ statusCode: 400, message: 'URL is required' })
  }

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(body.url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error()
  }
  catch {
    throw createError({ statusCode: 400, message: 'Invalid URL' })
  }

  // Fetch metadata
  const metadata = await fetchArticleMetadata(body.url)

  // Create story
  const result = await createStory(event, {
    url: body.url,
    headline: metadata.title,
    description: metadata.description,
    imageUrl: metadata.imageUrl,
    publishedAt: metadata.publishedAt,
    domain: metadata.domain,
    submittedBy: userId,
  })

  if (result.status === 'duplicate') {
    throw createError({ statusCode: 409, message: 'This story has already been submitted' })
  }

  if (result.status === 'irrelevant') {
    throw createError({ statusCode: 422, message: 'This article does not appear to be about Australian federal politics' })
  }

  if (result.status === 'no_pollies') {
    throw createError({ statusCode: 422, message: 'Could not identify any politicians in this article' })
  }

  return { storyId: result.storyId, status: result.status }
})
