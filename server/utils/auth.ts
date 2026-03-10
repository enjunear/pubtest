import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../database/schema'
import type { H3Event } from 'h3'

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'grr.la', 'guerrillamailblock.com',
  'pokemail.net', 'spam4.me', 'trashmail.com', 'trashmail.me',
  'trashmail.net', 'dispostable.com', 'maildrop.cc', 'mailnesia.com',
  'tempail.com', 'tempr.email', 'temp-mail.org', 'fakeinbox.com',
  'getnada.com', 'emailondeck.com', 'mailcatch.com', 'mintemail.com',
  'mohmal.com', 'burnermail.io', 'discard.email', 'discardmail.com',
  'harakirimail.com', 'mailexpire.com', 'mailforspam.com', 'safetymail.info',
  'tempmailaddress.com', 'tmpmail.net', 'tmpmail.org', 'wegwerfmail.de',
  '10minutemail.com', 'guerrillamail.info', 'guerrillamail.net',
  'guerrillamail.org', 'guerrillamail.de', 'crazymailing.com',
])

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? DISPOSABLE_EMAIL_DOMAINS.has(domain) : false
}

async function checkAccountCreationRateLimit(event: H3Event): Promise<boolean> {
  const ip = getRequestIP(event) || 'unknown'
  const ipHashed = hashIP(ip)
  const result = await checkRateLimit(event, 'signup', ipHashed, 3, 86400)
  return result.allowed
}

export function serverAuth(event: H3Event) {
  const env = event.context.cloudflare.env
  const db = drizzle(env.DB, { schema })

  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    secret: env.BETTER_AUTH_SECRET || 'local-dev-secret-at-least-32-characters-long',
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
          // Block disposable email domains
          if (isDisposableEmail(email)) {
            throw new Error('Disposable email addresses are not allowed. Please use a permanent email.')
          }

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
    databaseHooks: {
      user: {
        create: {
          before: async (_user) => {
            // Rate limit account creation: max 3 per IP per 24 hours
            const allowed = await checkAccountCreationRateLimit(event)
            if (!allowed) {
              return false
            }
            return true
          },
        },
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
