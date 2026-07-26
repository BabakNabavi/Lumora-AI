/**
 * db-migrate-deploy.mjs — applies pending migrations during a deploy build.
 *
 * Runs as part of `npm run build`. On a hosting platform the database
 * credential is only available to the build, so this is the natural place to
 * bring the schema up to date; `migrate deploy` is idempotent and never resets,
 * so repeat deploys are a no-op.
 *
 * When DATABASE_URL is absent the step is skipped rather than failing, so the
 * project still builds on a clean checkout with no database configured.
 */

import { spawnSync } from 'node:child_process'

// Only ever migrate from a deploy build. A local `npm run build` must not touch
// the developer's database: local schemas are created with `db push` and have
// no migration history, so `migrate deploy` would fail on them (P3005) and
// break the build. `npm run db:migrate:deploy -- --force` runs it by hand.
const isDeployBuild =
  process.env.VERCEL || process.env.CI || process.argv.includes('--force')

if (!isDeployBuild) {
  console.log('· local build — skipping migrations (use --force to override)')
  process.exit(0)
}

const url = process.env.DATABASE_URL

if (!url) {
  console.log('· DATABASE_URL not set — skipping migrations')
  process.exit(0)
}

// A pooled endpoint (PgBouncer, the Neon/Supabase poolers) cannot run the
// advisory locks and DDL the migration engine needs. Prefer the direct URL when
// the platform exposes one; every Neon-on-Vercel project gets it as
// DATABASE_URL_UNPOOLED.
const directUrl =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  url

const usingDirect = directUrl !== url
console.log(
  `· applying migrations via the ${usingDirect ? 'direct' : 'configured'} connection…`,
)

const result = spawnSync(
  'npx',
  ['prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
  {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, DATABASE_URL: directUrl },
  },
)

if (result.status !== 0) {
  console.error('\n✗ migrations failed — aborting the build rather than')
  console.error('  shipping application code against an out-of-date schema.')
  process.exit(result.status ?? 1)
}
