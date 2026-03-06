export interface ArticleMetadata {
  title: string
  description?: string
  imageUrl?: string
  publishedAt?: Date
  domain: string
}

export async function fetchArticleMetadata(url: string): Promise<ArticleMetadata> {
  const parsedUrl = new URL(url)
  const domain = parsedUrl.hostname.replace(/^www\./, '')

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; ThePubTest/1.0)',
      'Accept': 'text/html',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`Metadata fetch failed: ${response.status}`)
  }

  const html = await response.text()
  // Only parse the head section for efficiency
  const head = html.substring(0, html.indexOf('</head>') + 7) || html.substring(0, 10000)

  const ogTitle = extractMeta(head, 'og:title')
  const ogDesc = extractMeta(head, 'og:description')
  const ogImage = extractMeta(head, 'og:image')
  const ogPubTime = extractMeta(head, 'article:published_time')

  const metaDesc = extractMetaName(head, 'description')
  const htmlTitle = head.match(/<title[^>]*>([^<]+)<\/title>/)?.[1]?.trim()

  // Try JSON-LD for published date
  let jsonLdDate: string | undefined
  const jsonLdMatch = head.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
  if (jsonLdMatch?.[1]) {
    try {
      const ld = JSON.parse(jsonLdMatch[1])
      jsonLdDate = ld.datePublished || ld.dateCreated
    }
    catch {}
  }

  const title = ogTitle || htmlTitle
  if (!title) {
    throw new Error('Could not extract article title')
  }

  const pubDateStr = ogPubTime || jsonLdDate
  let publishedAt: Date | undefined
  if (pubDateStr) {
    const d = new Date(pubDateStr)
    if (!isNaN(d.getTime())) publishedAt = d
  }

  return {
    title,
    description: ogDesc || metaDesc,
    imageUrl: ogImage ? resolveUrl(ogImage, url) : undefined,
    publishedAt,
    domain,
  }
}

function extractMeta(html: string, property: string): string | undefined {
  const match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${property}["']`, 'i'))
  return match?.[1]
}

function extractMetaName(html: string, name: string): string | undefined {
  const match = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*name=["']${name}["']`, 'i'))
  return match?.[1]
}

function resolveUrl(url: string, base: string): string {
  if (url.startsWith('http')) return url
  try {
    return new URL(url, base).href
  }
  catch {
    return url
  }
}
