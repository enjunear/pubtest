import { createHmac } from 'node:crypto'
import { $fetch } from '@nuxt/test-utils/e2e'

const AUTH_SECRET = 'dev-secret-change-in-production'

function signCookie(value: string): string {
  const signature = createHmac('sha256', AUTH_SECRET)
    .update(value)
    .digest('base64')
  return `${value}.${signature}`
}

/**
 * Fetch wrapper that sends a signed Better Auth session cookie.
 */
export function authFetch(sessionToken: string) {
  const signed = signCookie(sessionToken)
  return (url: string, options: Parameters<typeof $fetch>[1] = {}) => {
    return $fetch(url, {
      ...options,
      headers: {
        ...options.headers as Record<string, string>,
        cookie: `better-auth.session_token=${signed}`,
      },
    })
  }
}

/**
 * Call $fetch expecting an error response, return the status code.
 * Optionally pass sessionToken to auto-sign and include auth cookie.
 */
export async function fetchStatus(
  url: string,
  options: Parameters<typeof $fetch>[1] & { sessionToken?: string } = {},
): Promise<number> {
  const { sessionToken, ...fetchOpts } = options as any
  if (sessionToken) {
    const signed = signCookie(sessionToken)
    fetchOpts.headers = {
      ...fetchOpts.headers,
      cookie: `better-auth.session_token=${signed}`,
    }
  }
  try {
    await $fetch(url, fetchOpts)
    return 200
  } catch (err: any) {
    return err?.response?.status ?? err?.statusCode ?? 500
  }
}
