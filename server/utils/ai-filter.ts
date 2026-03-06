import type { H3Event } from 'h3'
import { drizzle } from 'drizzle-orm/d1'
import { eq } from 'drizzle-orm'
import { politicians } from '../database/schema'

const POLITICAL_KEYWORDS = [
  'parliament', 'minister', 'senator', 'opposition', 'labor', 'liberal',
  'greens', 'coalition', 'legislation', 'bill', 'policy', 'federal',
  'government', 'cabinet', 'prime minister', 'treasurer', 'electorate',
  'election', 'budget', 'senate', 'house of representatives', 'backbench',
  'frontbench', 'portfolio', 'bipartisan', 'crossbench', 'teal',
  'nationals', 'albanese', 'dutton', 'wong', 'chalmers', 'plibersek',
]

export async function isArticlePolitical(
  event: H3Event,
  headline: string,
  description?: string,
): Promise<boolean> {
  const text = `${headline} ${description || ''}`.toLowerCase()

  const ai = event.context.cloudflare?.env?.AI
  if (ai) {
    try {
      const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: 'You classify news articles. Reply with only "yes" or "no".',
          },
          {
            role: 'user',
            content: `Is this article about Australian federal politics? Title: "${headline}" Description: "${description || 'N/A'}"`,
          },
        ],
        max_tokens: 3,
      }) as { response?: string }
      return result.response?.toLowerCase().includes('yes') ?? false
    }
    catch (err) {
      console.error('[AI Filter] Workers AI failed, falling back to keywords:', err)
    }
  }

  // Keyword fallback (dev mode or AI failure)
  return POLITICAL_KEYWORDS.some(kw => text.includes(kw))
}

export async function extractPoliticianIds(
  event: H3Event,
  headline: string,
  description?: string,
): Promise<number[]> {
  const db = drizzle(event.context.cloudflare.env.DB)
  const allPoliticians = await db
    .select({ id: politicians.id, name: politicians.name, displayName: politicians.displayName })
    .from(politicians)
    .where(eq(politicians.status, 'current'))

  const text = `${headline} ${description || ''}`.toLowerCase()
  const matched: number[] = []

  const ai = event.context.cloudflare?.env?.AI
  if (ai) {
    try {
      const pollyNames = allPoliticians.map(p => p.name).join(', ')
      const result = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          {
            role: 'system',
            content: `You extract politician names from news articles. You MUST only return names from this list: ${pollyNames}. Return matching names as a comma-separated list, or "none" if no politicians are mentioned.`,
          },
          {
            role: 'user',
            content: `Which politicians from the list are mentioned in this article? Title: "${headline}" Description: "${description || 'N/A'}"`,
          },
        ],
        max_tokens: 200,
      }) as { response?: string }

      if (result.response && result.response.toLowerCase() !== 'none') {
        const names = result.response.split(',').map(n => n.trim().toLowerCase())
        for (const polly of allPoliticians) {
          if (names.some(n =>
            polly.name.toLowerCase().includes(n)
            || n.includes(polly.name.toLowerCase())
            || polly.displayName.toLowerCase().includes(n)
            || n.includes(polly.displayName.toLowerCase()),
          )) {
            matched.push(polly.id)
          }
        }
      }
      if (matched.length > 0) return matched
    }
    catch (err) {
      console.error('[AI Extract] Workers AI failed, falling back to text match:', err)
    }
  }

  // Text matching fallback (dev mode or AI failure)
  for (const polly of allPoliticians) {
    const surname = polly.name.split(' ').pop()?.toLowerCase()
    if (surname && surname.length > 3 && text.includes(surname)) {
      matched.push(polly.id)
    }
  }

  return matched
}
