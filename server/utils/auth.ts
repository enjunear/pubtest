import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../database/schema'
import type { H3Event } from 'h3'

export function serverAuth(event: H3Event) {
  const env = event.context.cloudflare.env
  const db = drizzle(env.DB, { schema })

  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    secret: env.BETTER_AUTH_SECRET || 'dev-secret-change-in-production',
    baseURL: getRequestURL(event).origin,
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
