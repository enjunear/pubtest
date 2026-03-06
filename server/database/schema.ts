import { sql } from 'drizzle-orm'
import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core'

// ============================================================
// Better Auth managed tables
// Generated via @better-auth/cli, then integrated with app tables
// ============================================================

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date()),
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date()),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
}, (table) => [
  index('session_userId_idx').on(table.userId),
])

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date()),
}, (table) => [
  index('account_userId_idx').on(table.userId),
])

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date()),
}, (table) => [
  index('verification_identifier_idx').on(table.identifier),
])

// ============================================================
// App tables
// ============================================================

export const userProfiles = sqliteTable('user_profiles', {
  userId: text('user_id').primaryKey().references(() => user.id),
  electorateId: integer('electorate_id').references(() => electorates.id),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  onboardingComplete: integer('onboarding_complete', { mode: 'boolean' }).notNull().default(false),
  status: text('status', { enum: ['active', 'suspended', 'banned'] }).notNull().default('active'),
  ipHash: text('ip_hash'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastActive: integer('last_active', { mode: 'timestamp' }),
})

export const electorates = sqliteTable('electorates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  state: text('state').notNull(),
})

export const politicians = sqliteTable('politicians', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  party: text('party').notNull(),
  chamber: text('chamber', { enum: ['house', 'senate'] }).notNull(),
  electorateId: integer('electorate_id').references(() => electorates.id),
  state: text('state'),
  photoUrl: text('photo_url'),
  status: text('status', { enum: ['current', 'former'] }).notNull().default('current'),
  enteredParliament: text('entered_parliament'),
})

export const sources = sqliteTable('sources', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  domain: text('domain').notNull().unique(),
  name: text('name').notNull(),
  tier: integer('tier').notNull().default(3),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
})

export const rssFeeds = sqliteTable('rss_feeds', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sourceId: integer('source_id').notNull().references(() => sources.id),
  feedUrl: text('feed_url').notNull(),
  category: text('category'),
  pollIntervalMins: integer('poll_interval_mins').notNull().default(15),
  lastPolledAt: integer('last_polled_at', { mode: 'timestamp' }),
  lastArticleGuid: text('last_article_guid'),
  status: text('status', { enum: ['active', 'paused', 'error'] }).notNull().default('active'),
  errorCount: integer('error_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

export const storyClusters = sqliteTable('story_clusters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  primaryStoryId: integer('primary_story_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  storyCount: integer('story_count').notNull().default(1),
})

export const stories = sqliteTable('stories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  urlHash: text('url_hash').notNull().unique(),
  url: text('url').notNull(),
  headline: text('headline').notNull(),
  description: text('description'),
  sourceId: integer('source_id').references(() => sources.id),
  publishedAt: integer('published_at', { mode: 'timestamp' }),
  submittedAt: integer('submitted_at', { mode: 'timestamp' }).notNull(),
  submittedBy: text('submitted_by').references(() => user.id),
  thumbnailUrl: text('thumbnail_url'),
  status: text('status', { enum: ['active', 'moderation', 'rejected', 'archived'] }).notNull().default('active'),
  clusterId: integer('cluster_id').references(() => storyClusters.id),
}, (table) => [
  index('idx_stories_status_submitted').on(table.status, table.submittedAt),
])

export const storyPoliticians = sqliteTable('story_politicians', {
  storyId: integer('story_id').notNull().references(() => stories.id),
  politicianId: integer('politician_id').notNull().references(() => politicians.id),
}, (table) => [
  uniqueIndex('idx_story_politicians_unique').on(table.storyId, table.politicianId),
  index('idx_story_politicians_politician').on(table.politicianId),
])

export const votes = sqliteTable('votes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => user.id),
  clusterId: integer('cluster_id').notNull().references(() => storyClusters.id),
  vote: text('vote', { enum: ['pass', 'fail'] }).notNull(),
  ipHash: text('ip_hash'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('idx_votes_user_cluster').on(table.userId, table.clusterId),
])

export const pollyDailyStats = sqliteTable('polly_daily_stats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  politicianId: integer('politician_id').notNull().references(() => politicians.id),
  date: text('date').notNull(),
  approvalPct: real('approval_pct'),
  totalVotes: integer('total_votes').notNull().default(0),
  passCount: integer('pass_count').notNull().default(0),
  failCount: integer('fail_count').notNull().default(0),
}, (table) => [
  uniqueIndex('idx_polly_daily_stats_unique').on(table.politicianId, table.date),
])

export const adminLog = sqliteTable('admin_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adminId: text('admin_id').notNull().references(() => user.id),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
})
