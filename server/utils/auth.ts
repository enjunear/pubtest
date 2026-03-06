import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../database/schema'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _auth: any

export function serverAuth() {
  if (!_auth) {
    const event = useEvent()
    const env = event.context.cloudflare.env
    const db = drizzle(env.DB, { schema })

    _auth = betterAuth({
      database: drizzleAdapter(db, { provider: 'sqlite' }),
      secret: env.BETTER_AUTH_SECRET,
      baseURL: getBaseURL(),
      emailAndPassword: { enabled: false },
      socialProviders: {
        google: {
          clientId: env.GOOGLE_CLIENT_ID || '',
          clientSecret: env.GOOGLE_CLIENT_SECRET || '',
        },
      },
      session: {
        cookieCache: {
          enabled: true,
          maxAge: 5 * 60,
        },
      },
    })
  }
  return _auth as ReturnType<typeof betterAuth>
}

function getBaseURL() {
  let baseURL: string | undefined
  try {
    baseURL = getRequestURL(useEvent()).origin
  }
  catch {}
  return baseURL
}
