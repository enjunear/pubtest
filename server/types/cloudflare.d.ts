declare module 'h3' {
  interface H3EventContext {
    cloudflare: {
      env: {
        DB: D1Database
        RATE_LIMIT: KVNamespace
        AI: Ai
        BETTER_AUTH_SECRET: string
        GOOGLE_CLIENT_ID: string
        GOOGLE_CLIENT_SECRET: string
        BETTER_AUTH_URL?: string
        RESEND_API_KEY?: string
        TURNSTILE_SECRET_KEY?: string
      }
    }
  }
}

export {}
