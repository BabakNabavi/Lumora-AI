/**
 * verify-migration.mjs — applies prisma/migrations to a disposable, empty
 * PostgreSQL and reports whether it lands cleanly.
 *
 *   node scripts/verify-migration.mjs
 *
 * Nothing here touches the development database: a fresh PGlite instance is
 * created in a temp directory, migrated, inspected and deleted. That makes it a
 * closer match to a first deploy against an empty managed database than
 * re-migrating a database that already has the schema.
 */

import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'

const run = promisify(execFile)
const PORT = Number(process.env.VERIFY_PORT ?? 5455)

const dataDir = await mkdtemp(path.join(tmpdir(), 'migrate-verify-'))
const db = await PGlite.create({ dataDir })
await db.waitReady

const server = new PGLiteSocketServer({
  db,
  port: PORT,
  host: '127.0.0.1',
  maxConnections: 20,
  idleTimeout: 60_000,
})
await server.start()

const url = `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres?schema=public&pgbouncer=true`
let failed = false

try {
  console.log('· applying migrations to an empty database…')
  const { stdout } = await run(
    'npx',
    ['prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
    { env: { ...process.env, DATABASE_URL: url }, shell: true },
  )
  console.log(
    stdout
      .split('\n')
      .filter((l) => /migration|applied|No pending/i.test(l))
      .join('\n')
      .trim(),
  )

  // The schema is only proven if the client can actually round-trip against it.
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient({ datasources: { db: { url } } })

  const user = await prisma.user.create({
    data: { email: 'verify@example.test', name: 'Verify', credits: 3 },
  })
  const design = await prisma.design.create({
    data: {
      userId: user.id,
      title: 'Verification',
      roomType: 'living-room',
      style: 'modern',
      palette: 'neutral',
      lighting: 'natural',
      mood: 'calm',
      originalKey: 'uploads/x/y.webp',
      status: 'COMPLETED',
      insights: [{ title: 'a', body: 'b' }],
    },
  })
  await prisma.creditTransaction.create({
    data: { userId: user.id, amount: -1, balanceAfter: 2, reason: 'GENERATION' },
  })
  await prisma.generation.create({
    data: { userId: user.id, designId: design.id, provider: 'mock', status: 'COMPLETED' },
  })

  // Cascade behaviour is part of the schema contract — check it survived.
  await prisma.user.delete({ where: { id: user.id } })
  const orphanDesigns = await prisma.design.count()
  const orphanLedger = await prisma.creditTransaction.count()

  if (orphanDesigns !== 0 || orphanLedger !== 0) {
    throw new Error(
      `cascade delete did not clean up (designs=${orphanDesigns}, ledger=${orphanLedger})`,
    )
  }

  await prisma.$disconnect()
  console.log('· round-trip write, read and cascade delete all succeeded')
  console.log('\n✓ migration applies cleanly to an empty database')
} catch (error) {
  failed = true
  console.error('\n✗ migration verification failed\n')
  console.error(error.stdout ?? error.message ?? error)
} finally {
  await server.stop().catch(() => {})
  await db.close().catch(() => {})
  await rm(dataDir, { recursive: true, force: true }).catch(() => {})
}

process.exit(failed ? 1 : 0)
