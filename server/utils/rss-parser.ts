export interface FeedItem {
  url: string
  title: string
  description?: string
  publishedAt?: Date
  guid: string
}

export interface ParsedFeed {
  items: FeedItem[]
  title?: string
}

export async function fetchAndParseFeed(feedUrl: string): Promise<ParsedFeed> {
  const response = await fetch(feedUrl, {
    headers: { 'User-Agent': 'ThePubTest/1.0 (RSS Reader)' },
  })

  if (!response.ok) {
    throw new Error(`Feed fetch failed: ${response.status} ${response.statusText}`)
  }

  const xml = await response.text()
  return parseFeedXml(xml)
}

export function parseFeedXml(xml: string): ParsedFeed {
  if (xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"')) {
    return parseAtom(xml)
  }
  return parseRss(xml)
}

function parseRss(xml: string): ParsedFeed {
  const items: FeedItem[] = []

  const titleMatch = xml.match(/<channel>[\s\S]*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)
  const feedTitle = titleMatch?.[1]?.trim()

  const itemBlocks = xml.split(/<item[\s>]/)
  for (let i = 1; i < itemBlocks.length; i++) {
    const block = itemBlocks[i]!
    const endIdx = block.indexOf('</item>')
    const item = endIdx >= 0 ? block.substring(0, endIdx) : block

    const title = extractCdata(item, 'title')
    const link = extractTag(item, 'link')
    const description = extractCdata(item, 'description')
    const guid = extractTag(item, 'guid') || link
    const pubDate = extractTag(item, 'pubDate')

    if (!link || !title) continue

    items.push({
      url: link.trim(),
      title: title.trim(),
      description: description?.trim(),
      publishedAt: pubDate ? new Date(pubDate) : undefined,
      guid: guid || link,
    })
  }

  return { items, title: feedTitle }
}

function parseAtom(xml: string): ParsedFeed {
  const items: FeedItem[] = []

  const titleMatch = xml.match(/<feed[\s\S]*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)
  const feedTitle = titleMatch?.[1]?.trim()

  const entryBlocks = xml.split(/<entry[\s>]/)
  for (let i = 1; i < entryBlocks.length; i++) {
    const entry = entryBlocks[i]!
    const endIdx = entry.indexOf('</entry>')
    const content = endIdx >= 0 ? entry.substring(0, endIdx) : entry

    const title = extractCdata(content, 'title')

    const linkMatch = content.match(/<link[^>]*href="([^"]+)"[^>]*rel="alternate"/)
      || content.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/)
      || content.match(/<link[^>]*href="([^"]+)"/)
    const link = linkMatch?.[1]

    const summary = extractCdata(content, 'summary') || extractCdata(content, 'content')
    const id = extractTag(content, 'id') || link
    const updated = extractTag(content, 'updated') || extractTag(content, 'published')

    if (!link || !title) continue

    items.push({
      url: link.trim(),
      title: title.trim(),
      description: summary?.trim(),
      publishedAt: updated ? new Date(updated) : undefined,
      guid: id || link,
    })
  }

  return { items, title: feedTitle }
}

function extractTag(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))
  return match?.[1]
}

function extractCdata(xml: string, tag: string): string | undefined {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`))
  if (cdataMatch) return cdataMatch[1]
  return extractTag(xml, tag)
}
