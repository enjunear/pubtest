# The Pub Test — Requirements Document

## Overview

A web application that surfaces media stories about Australian federal politicians and lets the public vote on whether each story "passes the pub test." Aggregated approval/disapproval ratings are tracked over time for every Member of Parliament and Senator.

**Guiding principles:**
- Minimal hosting cost (target $0/month on free tiers)
- Maximum automation, minimum manual moderation
- User anonymity balanced with fraud prevention
- No user-generated text content (eliminates defamation risk)
- Federal politicians only (v1)

---

## 1. Users ("Punters")

### 1.1 Registration
- **Better Auth** with OAuth providers (Google, Apple) and/or magic link (email)
- No passwords stored in our database — zero credential risk on breach
- CAPTCHA on registration (Cloudflare Turnstile — free)
- Must declare they are 18+ (checkbox, not verified beyond declaration)
- Must select federal electorate from searchable dropdown (post-OAuth onboarding step)
- Rate limit: max 3 account creations per IP per 24 hours
- Email stored for magic link delivery; no other PII stored beyond electorate choice

### 1.2 Profile & Settings
- Change electorate
- Delete account (soft-delete, retain anonymised vote data for integrity)
- No public profile — punters are anonymous

### 1.3 Authentication
- **Better Auth** (`better-auth` + `@better-auth/nuxt`)
- OAuth providers: Google, Apple (covers vast majority of Australians)
- Magic link as fallback (for users without Google/Apple accounts)
- Sessions managed by Better Auth (stored in D1 via Drizzle adapter)
- No passwords, no password reset flow needed
- Better Auth handles session tokens, CSRF protection, token refresh

---

## 2. Politicians ("Pollies")

### 2.1 Data Model
- Full name
- Preferred name / display name
- Party
- Chamber (House of Representatives / Senate)
- Electorate (HoR members) or State/Territory (Senators)
- Photo URL
- Status (current / former)
- Date entered parliament

### 2.2 Data Source
- Seed from Australian Parliament House data and/or OpenAustralia API
- Manual update process for reshuffles, elections, by-elections
- Future: automate updates via periodic scraping of APH website

### 2.3 Polly Profile Page
- Photo, name, party, electorate/state
- Overall approval rating (percentage of "pass" votes across all linked stories)
- Approval trend chart over time (line graph, rolling 30/90/all-time)
- List of linked stories sorted by recency, each showing vote tally
- Filterable by time period

---

## 3. Stories

### 3.1 Ingestion

Stories enter the system via two channels:

#### 3.1.1 RSS Auto-Ingestion (Primary)
- Subscribe to RSS/Atom feeds from Tier 1 and Tier 2 news sources
- Cloudflare Worker cron job polls feeds on a schedule (e.g., every 15–30 minutes)
- For each new article in a feed:
  - Check URL against existing stories (dedup)
  - Fetch full metadata via OpenGraph / meta tags
  - AI filters for political relevance (discard non-political articles)
  - AI extracts mentioned politicians and matches against polly database
  - If politically relevant and links to at least one polly: auto-publish
  - If uncertain relevance: discard (err on the side of less noise)
- No human involvement — stories appear automatically

**Known RSS feeds for Australian political news:**
- abc.net.au/news/feed/51120/rss.xml (ABC Politics)
- theguardian.com/australia-news/rss (Guardian Australia)
- feeds.smh.com.au/rss/politics/federal.xml (SMH Federal Politics)
- sbs.com.au/news/topic/politics/feed (SBS Politics)
- theconversation.com/au/politics/articles.atom (The Conversation)
- Additional feeds to be catalogued per source

**RSS Feed Data Model:**
- Feed URL
- Source ID (links to sources table)
- Last polled timestamp
- Last seen article URL/GUID
- Poll interval (minutes)
- Status (active / paused / error)
- Error count (for backoff on failing feeds)

#### 3.1.2 User Submission (Supplementary)
- User submits a URL only — no other input
- System auto-fetches via URL metadata (OpenGraph / meta tags):
  - Headline (og:title or <title>)
  - Description (og:description or meta description)
  - Published date (article:published_time or datePublished from JSON-LD)
  - Source domain
  - Thumbnail image (og:image)
- AI extracts and suggests polly links — user confirms before submission
- If metadata fetch fails, reject with error message
- Catches stories the RSS ingestion missed (smaller outlets, opinion pieces, etc.)

### 3.2 Source Reputation
- Whitelist of reputable Australian news domains, organised into tiers:
  - **Tier 1 (auto-approve):** abc.net.au, sbs.com.au, theguardian.com (AU edition), smh.com.au, theaustralian.com.au, afr.com, 9news.com.au, 7news.com.au, news.com.au, theconversation.com, crikey.com.au, skynews.com.au
  - **Tier 2 (auto-approve, lower ranking):** Regional/state outlets, niche political media
  - **Tier 3 (requires moderation):** Unknown or unranked domains
- Admin can add/remove/re-tier domains
- Stories from Tier 3 sources enter a moderation queue

### 3.3 Politician Linking
- **AI-powered:** On submission, the article text is analysed to extract mentioned politicians
- Match extracted names against the polly database
- Submitter confirms/adjusts the AI-suggested polly links before final submission
- A story can link to multiple pollies

### 3.4 Deduplication & Grouping
- **URL-level dedup:** Same URL = same story, reject duplicate submission
- **AI-powered story grouping:** Multiple articles about the same event/topic are grouped into a "story cluster"
- Each cluster shows the primary headline but links to all source articles
- Votes are cast on the cluster, not individual articles
- This prevents vote-splitting across outlets covering the same event

### 3.5 Story Data Model
- URL
- Headline (auto-fetched, immutable)
- Description (auto-fetched)
- Source domain
- Published date
- Submitted date
- Submitting user ID
- Thumbnail URL
- Status (active / moderation / rejected / archived)
- Story cluster ID (nullable — grouped stories share a cluster)

---

## 4. Voting

### 4.1 Mechanics
- Binary vote: **Passes** or **Fails** the pub test
- One vote per user per story cluster
- User can change their vote at any time
- Vote is recorded with timestamp (for trend calculations)
- No public attribution — votes are anonymous

### 4.2 Display
- Each story shows: total passes, total fails, pass percentage
- Visual indicator (green/red bar, percentage)

### 4.3 Aggregation
- Per-polly approval rating = total "pass" votes / total votes across all linked stories
- Recalculated periodically (or on-demand with caching)
- Daily snapshot stored for trend tracking

---

## 5. Feed & Discovery

### 5.1 Home Feed
- Default sort: **hot** (combination of recency and vote velocity)
- Score formula (Reddit-style): `score = log10(votes) + (age_hours / -decay_factor)`
- Stories older than ~7 days naturally sink unless still getting heavy activity
- User's local MP and state senators' stories are **boosted** (multiplier on score or pinned section)

### 5.2 Filters & Views
- "Hot" (default), "New", "Most Voted"
- Filter by: party, chamber, state, "My Electorate"
- Search by polly name

### 5.3 Polly Leaderboard
- Ranked list of pollies by approval rating
- Filterable by party, chamber, state
- "Most improved" / "biggest drop" (based on trend data)

---

## 6. Historical Tracking & Trends

### 6.1 Data Collection
- Daily cron job snapshots each polly's approval rating
- Store: polly_id, date, approval_pct, total_votes, pass_count, fail_count

### 6.2 Visualisation
- Line chart on polly profile page (approval % over time)
- Selectable time range: 30 days, 90 days, 1 year, all time
- Overlay with key events (optional future feature — e.g., election dates)

### 6.3 Aggregate Views
- Party-level average approval over time
- "Parliament mood" — overall approval trend across all pollies

---

## 7. Anti-Manipulation

### 7.1 Account-Level
- Email verification required before any activity
- CAPTCHA on registration (Cloudflare Turnstile)
- Rate limit account creation per IP (3/day)
- New accounts have a "cooling off" period (e.g., first 24 hours: limited to 10 votes)

### 7.2 Voting
- Server-side enforcement: one vote per user per story
- Rate limit: max ~50 votes per hour per account (prevent bot rapid-fire)
- Track IP per vote for anomaly detection
- Flag accounts that vote in lockstep patterns (future: automated detection)

### 7.3 Story Submission
- Rate limit: max 10 submissions per day per account
- Tier 1/2 sources only for auto-approval
- New accounts cannot submit stories for first 48 hours

### 7.4 Monitoring (Admin)
- Dashboard showing: votes per hour, new accounts per day, flagged IPs
- Ability to ban accounts, ban IPs, bulk-reverse suspicious votes

---

## 8. Admin

### 8.1 Capabilities
- Moderate story queue (approve/reject Tier 3 source stories)
- Manage source reputation tiers (add/remove domains, change tier)
- Manage polly database (add/edit/deactivate politicians)
- Ban/suspend user accounts
- View basic analytics (daily active users, votes cast, stories submitted)
- Fraud detection dashboard

### 8.2 Automation Goals
- RSS feeds auto-ingest stories with zero human involvement
- AI filters for political relevance, extracts and links pollies
- AI handles story grouping/deduplication
- Tier 1/2 sources require zero admin intervention
- Admin effort should be < 15 minutes/day under normal operation
- The platform should function indefinitely with no admin interaction (stories flow in via RSS, users vote)

---

## 9. Legal & Compliance

### 9.1 Terms of Service
- Votes are expressions of personal opinion
- Platform does not endorse any political position
- Users agree not to manipulate votes or create fake accounts

### 9.2 Privacy Policy
- Compliant with Australian Privacy Act 1988
- Data collected: email, electorate, IP addresses (for fraud detection), votes
- No data sold to third parties
- User can request data deletion

### 9.3 Defamation Mitigation
- No user-generated text content (headlines auto-fetched from source)
- No comments
- Votes are anonymous expressions of opinion (protected under fair comment)
- Links to third-party journalism only — platform does not create content

---

## 10. Tech Stack (Recommended)

### 10.1 Framework & Hosting
| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Framework** | Nuxt 3 (Vue) | Vue ecosystem, SSR, excellent Cloudflare support |
| **Hosting** | Cloudflare Pages | Free tier: unlimited requests, bandwidth, sites |
| **API/Backend** | Cloudflare Workers (via Nitro) | Free tier: 100K requests/day. Nuxt's Nitro engine deploys natively |
| **Database** | Cloudflare D1 (SQLite) | Free tier: 5M reads/day, 100K writes/day, 5GB storage |
| **Auth** | Better Auth | OAuth (Google/Apple) + magic link. No passwords stored. D1 adapter via Drizzle |
| **Rate Limiting** | Cloudflare KV + Workers | IP tracking and rate limit counters |
| **CAPTCHA** | Cloudflare Turnstile | Free, privacy-friendly, integrates natively |
| **Email** | Resend (free tier: 3K emails/mo) | Magic link delivery only (no password resets needed) |
| **AI (dedup/linking)** | Cloudflare Workers AI | Free tier includes inference on open models |
| **RSS Ingestion** | Cloudflare Workers Cron Triggers | Free tier includes cron triggers. Polls feeds on schedule |
| **Charts** | Chart.js or lightweight alternative | Trend visualisation, client-side rendering |

### 10.2 Cost Projection
| Scale | Monthly Cost |
|-------|-------------|
| 0–1K users | $0 |
| 1K–10K users | $0–5 (may need KV paid tier) |
| 10K–50K users | $5–25 (D1 + Workers paid tiers) |
| 50K+ users | $25–50 (still very cheap at scale) |

### 10.3 Why Cloudflare over Vercel?
- More generous free tier (especially for API calls)
- D1 is included and free (Vercel needs external DB)
- KV for sessions/rate-limiting is built-in
- Turnstile for CAPTCHA is native and free
- Workers AI for the AI features is included
- Global edge network for fast Australian delivery
- All services under one account/billing

### 10.4 Nuxt 3 on Cloudflare
- Nuxt 3's Nitro engine has a first-class `cloudflare-pages` preset
- Server routes become Workers automatically
- File-based routing, composables, Vue 3 Composition API
- Ecosystem: Nuxt UI for component library, @nuxtjs/color-mode for dark mode

---

## 11. Data Architecture

### 11.1 Core Tables (D1/SQLite)

```
-- Better Auth managed tables (auto-created by Better Auth)
user              -- id, name, email, emailVerified, image, createdAt, updatedAt
session           -- id, expiresAt, token, ipAddress, userAgent, userId
account           -- id, accountId, providerId, userId, accessToken, refreshToken, ...
verification      -- id, identifier, value, expiresAt, createdAt, updatedAt

-- App-specific user extension
user_profiles
  user_id (FK to Better Auth user.id), electorate_id,
  is_admin, created_at, last_active, status, ip_hash,
  onboarding_complete (boolean — has user selected electorate?)

electorates
  id, name, state, chamber

politicians
  id, name, display_name, party, chamber, electorate_id,
  state, photo_url, status, entered_parliament

sources
  id, domain, name, tier, is_active

rss_feeds
  id, source_id, feed_url, category, poll_interval_mins,
  last_polled_at, last_article_guid, status (active/paused/error),
  error_count, created_at

stories
  id, url_hash, url, headline, description, source_id,
  published_at, submitted_at, submitted_by, thumbnail_url,
  status, cluster_id

story_clusters
  id, primary_story_id, created_at, story_count

story_politicians (many-to-many)
  story_id, politician_id

votes
  id, user_id, cluster_id, vote (pass/fail),
  created_at, updated_at, ip_hash

polly_daily_stats
  politician_id, date, approval_pct, total_votes,
  pass_count, fail_count

admin_log
  id, admin_id, action, target_type, target_id, timestamp
```

### 11.2 Key Indexes
- votes: (user_id, cluster_id) unique — enforces one vote per user per story
- stories: (url_hash) unique — enforces URL deduplication
- stories: (status, submitted_at) — feed queries
- story_politicians: (politician_id) — polly profile queries
- polly_daily_stats: (politician_id, date) — trend queries

---

## 12. MVP Scope (Phase 1)

To get something live quickly:

1. Polly database seeded with current federal parliament
2. Electorate selection on registration
3. **RSS auto-ingestion** from Tier 1 sources (the core content pipeline)
4. AI relevance filtering and polly-linking on ingested articles
5. User story submission as supplementary source
6. Source reputation whitelist (Tier 1 auto-approve only)
7. Voting (pass/fail)
8. Home feed with hot ranking + electorate boost
9. Polly profile page with stories and approval rating
10. Basic anti-manipulation (rate limits, email verification, Turnstile)
11. Simple admin panel for feed management and moderation queue

### Phase 2 (Post-Launch)
- Story clustering / deduplication via AI
- Expand RSS feeds to Tier 2 sources
- Trend charts and historical tracking
- Polly leaderboard with "most improved" / "biggest drop"
- Party-level aggregate ratings
- Advanced fraud detection
- Push notifications / email digest for your electorate

### Phase 3 (Growth)
- State/territory politician support
- Mobile app (or PWA)
- API for third-party data consumers
- Integration with parliamentary voting records (TheyVoteForYou)
- RSS feed health monitoring and auto-discovery of new feeds
