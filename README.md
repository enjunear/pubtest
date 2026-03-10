# The Pub Test 🍺

**Does it pass the pub test?**

A web app that surfaces media stories about Australian federal politicians and lets the public vote on whether each story "passes the pub test." Aggregated approval/disapproval ratings are tracked over time for every Member of Parliament and Senator — promoting accountability through crowdsourced opinion.

## How It Works

1. **Stories come in** — News articles are automatically ingested from RSS feeds of major Australian outlets, or submitted by users
2. **AI filters & links** — Workers AI determines political relevance and identifies which politicians are mentioned
3. **The public votes** — Registered users vote Pass or Fail on each story
4. **Ratings aggregate** — Every politician gets a running approval rating based on all votes across their linked stories

No user-generated text content. No comments. No defamation risk. Just vote.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Nuxt 3](https://nuxt.com/) (Vue 3 + TypeScript) |
| UI | [Nuxt UI](https://ui.nuxt.com/) + [Tailwind CSS](https://tailwindcss.com/) |
| Hosting | [Cloudflare Pages](https://pages.cloudflare.com/) + Workers |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | [Better Auth](https://www.better-auth.com/) (OAuth + magic link) |
| AI | [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/) |
| Rate Limiting | Cloudflare KV |
| CAPTCHA | Cloudflare Turnstile |
| Package Manager | pnpm |

## Features

- **Automated story ingestion** — RSS feeds polled every 15 minutes via Cloudflare cron
- **AI-powered filtering** — LLM classifies political relevance and extracts politician mentions
- **Story clustering** — Embedding-based deduplication groups articles covering the same event
- **Pass/Fail voting** — Simple binary vote with optimistic UI updates
- **Politician profiles** — Approval ratings, trend charts, linked stories
- **Leaderboard** — Politicians ranked by approval rating
- **Electorate heatmap** — Hex cartogram visualization (equal visual weight per electorate)
- **User submissions** — Submit articles from any source (Tier 1/2 auto-approved, Tier 3 moderated)
- **Admin panel** — Moderation queue, source/politician management, fraud detection
- **Anti-manipulation** — IP-based rate limiting, new account throttling, anomaly detection
- **Zero passwords** — Google/Apple OAuth + magic link only

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`pnpm add -g wrangler`)
- A Cloudflare account (free tier works)

### Setup

```bash
# Clone the repo
git clone https://github.com/your-org/pubtest.git
cd pubtest

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Fill in your secrets (see Environment Variables below)
```

### Create Cloudflare Resources

```bash
# Create D1 database
wrangler d1 create pubtest-db
# Copy the database_id into wrangler.toml

# Create KV namespace for rate limiting
wrangler kv namespace create RATE_LIMIT
# Copy the namespace id into wrangler.toml

# Run database migrations
pnpm db:migrate
```

### Development

```bash
# Start local dev server (uses Wrangler for D1/KV/AI bindings)
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch
```

## Environment Variables

Create a `.env` file from `.env.example`:

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_SECRET` | Secret key for session signing |
| `BETTER_AUTH_URL` | Production URL (e.g. `https://pubtest.com.au`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `RESEND_API_KEY` | [Resend](https://resend.com/) API key for magic link emails |
| `NUXT_TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (public) |

For production, set secrets via Wrangler:

```bash
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
# etc.
```

## Project Structure

```
app/
├── pages/              # Nuxt file-based routing
├── components/         # Vue components (StoryCard, ElectorateHeatmap)
├── composables/        # useAuth, useVoting
├── middleware/          # Auth & admin route guards
├── layouts/            # Default & admin layouts
├── plugins/            # Better Auth initialization
└── utils/              # Auth client, hex cartogram calculations

server/
├── api/                # Nitro API endpoints
│   ├── auth/           # Better Auth handler
│   ├── admin/          # Admin endpoints (protected)
│   ├── cron/           # RSS feed polling (cron-triggered)
│   ├── politicians/    # Politician data & approval ratings
│   ├── stories/        # Story feed & submission
│   ├── settings/       # User settings
│   └── votes.*         # Voting endpoints
├── database/
│   ├── schema.ts       # Drizzle ORM schema
│   ├── migrations/     # D1 SQL migrations
│   └── seeds/          # Source & feed seed data
└── utils/              # Business logic
    ├── story-service   # Story creation, clustering
    ├── rss-poller      # Feed polling
    ├── ai-filter       # LLM filtering & extraction
    ├── metadata-fetcher # OpenGraph scraping
    └── rate-limit      # KV-based throttling
```

## Database

The schema uses Drizzle ORM with SQLite (D1). Key tables:

- **user / session / account** — Better Auth managed tables
- **user_profiles** — Electorate, admin status, account state
- **politicians** — MPs & Senators with party, chamber, electorate
- **electorates** — Federal electorates with start/end dates
- **stories** — News articles with URL dedup, status, thumbnails
- **story_clusters** — Grouped stories covering the same event
- **story_politicians** — Many-to-many story-to-politician links
- **votes** — Pass/fail votes (one per user per cluster)
- **sources / rss_feeds** — News outlets and their RSS feeds with tier system
- **polly_daily_stats** — Daily approval rating snapshots

### Migrations

```bash
# Generate a new migration
pnpm drizzle-kit generate --name=description-here

# Apply migrations to D1
pnpm db:migrate
```

## Story Ingestion Pipeline

Stories enter the system through two channels:

### Automated RSS (Primary)
Cloudflare cron job runs every 15 minutes:
1. Polls active RSS feeds from Tier 1 & 2 sources
2. Deduplicates by URL hash
3. AI filters for political relevance
4. Extracts & links mentioned politicians
5. Generates embeddings for story clustering (cosine similarity > 0.82)
6. Auto-publishes or sends to moderation queue

### User Submission (Supplementary)
1. User submits a URL on `/submit`
2. Metadata fetched via OpenGraph tags
3. AI suggests politician links
4. Tier 1/2 sources auto-approve; Tier 3 enters moderation

### Source Tiers
- **Tier 1** — Major national outlets (ABC, SBS, Guardian, SMH, etc.) — auto-approved
- **Tier 2** — Regional outlets (Canberra Times, Brisbane Times, etc.) — auto-approved
- **Tier 3** — Unknown sources — requires admin review

## Deployment

```bash
# Build and deploy to Cloudflare Pages
pnpm deploy

# Or separately:
pnpm build
wrangler pages deploy dist
```

## Design Principles

- **$0/month target** — Built entirely on Cloudflare free tiers
- **No passwords** — OAuth + magic link eliminates credential risk
- **No user-generated text** — Eliminates moderation burden and defamation liability
- **Anonymous voting** — No public attribution of votes
- **AI-first ingestion** — Automated pipeline minimises manual moderation
- **Federal scope (v1)** — Federal politicians only; state/local is a future expansion

## License

All rights reserved.
