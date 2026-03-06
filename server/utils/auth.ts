import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

// This will be properly initialised with D1 bindings in the event handler.
// For now, this config is used by the Better Auth CLI to generate/check schema.
export const auth = betterAuth({
  database: drizzleAdapter(null as any, {
    provider: 'sqlite',
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
})
