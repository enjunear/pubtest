import type { H3Event } from 'h3'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfter?: number
}

/**
 * Check rate limit using Cloudflare KV.
 * Key format: `rl:{scope}:{identifier}`
 * Stores a JSON array of timestamps within the window.
 */
export async function checkRateLimit(
  event: H3Event,
  scope: string,
  identifier: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const kv = event.context.cloudflare.env.RATE_LIMIT
  const key = `rl:${scope}:${identifier}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  const raw = await kv.get(key)
  let timestamps: number[] = raw ? JSON.parse(raw) : []

  // Prune expired entries
  timestamps = timestamps.filter(t => now - t < windowMs)

  if (timestamps.length >= maxRequests) {
    const oldestInWindow = timestamps[0]!
    const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  timestamps.push(now)
  await kv.put(key, JSON.stringify(timestamps), { expirationTtl: windowSeconds })

  return { allowed: true, remaining: maxRequests - timestamps.length }
}

export function hashIP(ip: string): string {
  // Simple deterministic hash for IP tracking (not cryptographic)
  let hash = 0
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash.toString(36)
}
