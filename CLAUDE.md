# Project: The Pub Test

## Development Guidelines

- Use `pnpm` as package manager (not npm or yarn). Use `pnpm` to run local scripts (not `pnpx` or `npx`)
- Make atomic, logical commits as work progresses — don't batch large changes
- Use `playwright-cli` to view/verify pages visually
- Always `.gitignore` node_modules before committing
- Develop and test everything locally (via `wrangler dev`) before deploying to production
- Use Better Auth CLI to generate auth schema — don't hand-write auth tables
- Be careful about which pnpm build scripts to approve — review each package
- Initial database migration should always be named "init" (e.g., `0000_init.sql`)
- Electorates should be seeded at runtime by fetching from AEC, not from static SQL files
- Electorates have start and end dates (electorates are created/removed over time)
- Add steering instructions to this file when given by the user

## Tech Stack

- **Framework:** Nuxt 3 (Vue) with TypeScript
- **Hosting:** Cloudflare Pages + Workers + D1 + KV
- **Auth:** Better Auth (OAuth + magic link, no passwords)
- **ORM:** Drizzle ORM with D1 adapter
- **UI:** Nuxt UI
- **Package Manager:** pnpm

## Branch Strategy

- `main` = deployable (squash merge only)
- Feature branches per phase: `phase-N/description`
- Auto-delete branches after merge
