import { drizzle } from 'drizzle-orm/d1'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  user, session, account, verification, userProfiles,
  electorates, politicians, sources, rssFeeds,
  storyClusters, stories, storyPoliticians, votes,
  pollyDailyStats, adminLog,
} from '../../database/schema'

async function runMigration(d1: any) {
  const migrationPath = resolve(process.cwd(), 'server/database/migrations/0000_init.sql')
  const migrationSql = await readFile(migrationPath, 'utf-8')
  const cleaned = migrationSql
    .replace(/--> statement-breakpoint/g, '')
    .replace(/CREATE TABLE /g, 'CREATE TABLE IF NOT EXISTS ')
    .replace(/CREATE UNIQUE INDEX /g, 'CREATE UNIQUE INDEX IF NOT EXISTS ')
    .replace(/CREATE INDEX /g, 'CREATE INDEX IF NOT EXISTS ')
  const statements = cleaned
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)
  for (const stmt of statements) {
    await d1.prepare(stmt).run()
  }
}

const TABLES = [
  'admin_log', 'polly_daily_stats', 'votes', 'story_politicians',
  'stories', 'story_clusters', 'rss_feeds', 'sources',
  'user_profiles', 'politicians', 'electorates',
  'verification', 'account', 'session', 'user',
]

export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const body = await readBody<{ action: string; data?: any }>(event)
  const d1 = event.context.cloudflare.env.DB
  const db = drizzle(d1)

  switch (body.action) {
    case 'migrate': {
      await runMigration(d1)
      return { ok: true }
    }

    case 'reset': {
      // Ensure all tables exist (Better Auth may have created some already)
      await runMigration(d1)
      // Delete all data (order matters for FK constraints)
      for (const table of TABLES) {
        await d1.prepare(`DELETE FROM "${table}"`).run()
      }
      // Clear KV rate-limit keys
      const kv = event.context.cloudflare.env.RATE_LIMIT
      const keys = await kv.list()
      for (const key of keys.keys) {
        await kv.delete(key.name)
      }
      return { ok: true }
    }

    case 'createUser': {
      const d = body.data as {
        id: string
        name: string
        email: string
        sessionToken: string
        isAdmin?: boolean
        onboardingComplete?: boolean
        electorateId?: number
        createdAt?: string
      }
      const now = new Date()
      const createdAt = d.createdAt ? new Date(d.createdAt) : now

      await db.insert(user).values({
        id: d.id,
        name: d.name,
        email: d.email,
        emailVerified: true,
        createdAt: createdAt,
        updatedAt: now,
      })

      await db.insert(session).values({
        id: `session-${d.id}`,
        token: d.sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        userId: d.id,
        createdAt: now,
        updatedAt: now,
      })

      await db.insert(userProfiles).values({
        userId: d.id,
        isAdmin: d.isAdmin ?? false,
        onboardingComplete: d.onboardingComplete ?? true,
        electorateId: d.electorateId ?? null,
        status: 'active',
        createdAt: createdAt,
        lastActive: now,
      })

      return { ok: true }
    }

    case 'seed': {
      const d = body.data as {
        electorates?: Array<{ id?: number; name: string; state: string }>
        politicians?: Array<{
          id?: number; name: string; displayName: string; party: string
          chamber: 'house' | 'senate'; electorateId?: number; state?: string
        }>
        sources?: Array<{ id?: number; domain: string; name: string; tier?: number }>
        stories?: Array<{
          id?: number; urlHash: string; url: string; headline: string
          description?: string; sourceId?: number; status?: string; clusterId?: number
        }>
        clusters?: Array<{ id?: number; primaryStoryId?: number; storyCount?: number }>
        storyPoliticians?: Array<{ storyId: number; politicianId: number }>
      }

      const now = new Date()

      if (d.electorates) {
        for (const e of d.electorates) {
          await db.insert(electorates).values({ ...e, startDate: '2022-01-01' })
        }
      }

      if (d.politicians) {
        for (const p of d.politicians) {
          await db.insert(politicians).values(p)
        }
      }

      if (d.sources) {
        for (const s of d.sources) {
          await db.insert(sources).values({ ...s, tier: s.tier ?? 1, isActive: true })
        }
      }

      if (d.clusters) {
        for (const c of d.clusters) {
          await db.insert(storyClusters).values({
            ...c,
            createdAt: now,
            storyCount: c.storyCount ?? 1,
          })
        }
      }

      if (d.stories) {
        for (const s of d.stories) {
          await db.insert(stories).values({
            ...s,
            status: (s.status as any) ?? 'active',
            submittedAt: now,
          })
        }
      }

      if (d.storyPoliticians) {
        for (const sp of d.storyPoliticians) {
          await db.insert(storyPoliticians).values(sp)
        }
      }

      return { ok: true }
    }

    default:
      throw createError({ statusCode: 400, message: `Unknown action: ${body.action}` })
  }
})
