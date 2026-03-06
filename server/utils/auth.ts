import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
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
      plugins: [
        magicLink({
          sendMagicLink: async ({ email, url }) => {
            if (env.RESEND_API_KEY) {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'The Pub Test <noreply@pubtest.com.au>',
                  to: email,
                  subject: 'Sign in to The Pub Test',
                  html: `<p>Click <a href="${url}">here</a> to sign in to The Pub Test.</p><p>This link expires in 5 minutes.</p>`,
                }),
              })
            }
            else {
              console.log(`[Magic Link] ${email}: ${url}`)
            }
          },
        }),
      ],
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
