/**
 * Cache utility using Cloudflare Cache API.
 *
 * The Cache API is free with no daily operation limits, unlike KV which
 * has a 1,000 writes/day cap on the free tier. Use this for all
 * read-heavy caching; reserve KV for rate limiting only.
 *
 * Falls back to no-op in environments without the Cache API (e.g. local
 * Node dev without wrangler).
 */

// Cloudflare Workers extends CacheStorage with a `default` property
declare global {
  interface CacheStorage {
    default: Cache
  }
}

const CACHE_PREFIX = 'https://cache.internal/'

export async function getCached<T>(key: string): Promise<T | null> {
  if (typeof caches === 'undefined') return null

  try {
    const cache = caches.default
    const response = await cache.match(new Request(`${CACHE_PREFIX}${key}`))
    if (!response) return null
    return await response.json() as T
  } catch {
    return null
  }
}

export async function setCached<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  if (typeof caches === 'undefined') return

  try {
    const cache = caches.default
    const request = new Request(`${CACHE_PREFIX}${key}`)
    const response = new Response(JSON.stringify(data), {
      headers: {
        'Cache-Control': `s-maxage=${ttlSeconds}`,
        'Content-Type': 'application/json',
      },
    })
    await cache.put(request, response)
  } catch {
    // Caching is best-effort — silent fail
  }
}
