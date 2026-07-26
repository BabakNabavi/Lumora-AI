/**
 * pg-dev-server.mjs — zero-install PostgreSQL for local development.
 *
 * Runs PGlite (PostgreSQL 17 compiled to WASM) behind a real PostgreSQL wire
 * protocol socket, so Prisma, psql and any other client connect to it exactly
 * as they would to a normal server. Nothing about the application, the schema
 * or the connection string changes — production points at a managed Postgres,
 * development can point here.
 *
 *   npm run db:server
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/postgres?pgbouncer=true"
 *
 * All client connections are multiplexed onto one PGlite instance, so they share
 * a prepared-statement namespace — `pgbouncer=true` tells Prisma not to use
 * prepared statements, exactly as it would against any connection pooler.
 *
 * Data is persisted in ./.pgdata so migrations and seeds survive restarts. Stop
 * this with Ctrl-C: force-killing the process can corrupt that directory exactly
 * as it would a real cluster. To recover, delete .pgdata and re-run db:push.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '..', '.pgdata')
const PORT = Number(process.env.PGLITE_PORT ?? 5433)
const HOST = process.env.PGLITE_HOST ?? '127.0.0.1'

console.log('· starting embedded PostgreSQL (PGlite)…')
const db = await PGlite.create({ dataDir: DATA_DIR })
await db.waitReady

const server = new PGLiteSocketServer({
  db,
  port: PORT,
  host: HOST,
  // Prisma opens a pool per process, and `next build` runs several workers —
  // a low cap here surfaces as "Server has closed the connection" during builds.
  maxConnections: 60,
  // Without this, a connection whose client was killed (an aborted `next dev`,
  // a crashed build worker) holds its slot forever. Across a few restarts the
  // slots leak until the server stops accepting and Prisma reports
  // "Can't reach database server" while the port is still listening.
  idleTimeout: 120_000,
})

await server.start()

console.log(`
  ✓ PostgreSQL ready

    host      ${HOST}
    port      ${PORT}
    data dir  ${path.relative(process.cwd(), DATA_DIR)}

    DATABASE_URL="postgresql://postgres:postgres@localhost:${PORT}/postgres?schema=public&pgbouncer=true"

  Leave this running, then in another terminal:
    npm run db:push && npm run db:seed && npm run dev
`)

let shuttingDown = false
async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`\n· ${signal} — stopping PostgreSQL…`)
  try {
    await server.stop()
    await db.close()
  } catch {
    /* already gone */
  }
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
