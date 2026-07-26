/**
 * Seed — gives a fresh database a believable starting state.
 *
 *   npm run db:seed
 *
 * Creates an admin, a demo account and a portfolio of finished designs. Rather
 * than pointing at placeholder files, it reuses the generated inspiration
 * artwork as each design's *result* and derives a matching "before" photograph
 * from it (desaturated, flattened, slightly softened) — so the comparison
 * slider, the gallery and the detail pages all have real, paired images.
 *
 * Written against Prisma directly rather than the application services: the
 * seed must not depend on the request-scoped runtime.
 */

import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

import { PrismaClient, type Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import sharp from 'sharp'

const db = new PrismaClient()

const ROOT = process.cwd()
const GENERATED = path.join(ROOT, 'public', 'assets', 'generated')
const STORAGE_DIR = path.resolve(ROOT, process.env.STORAGE_LOCAL_DIR ?? './storage')

const ADMIN_EMAIL = 'admin@interiorstudio.app'
const DEMO_EMAIL = 'demo@interiorstudio.app'
const PASSWORD = 'Studio2026'

interface Manifest {
  inspirations: {
    slug: string
    title: string
    room: string
    style: string
    palette: string
    lighting: string
    mood: string
  }[]
}

/* ── storage helpers (mirrors the local driver's on-disk contract) ─────────── */

async function putObject(key: string, body: Buffer, contentType: string) {
  const abs = path.join(STORAGE_DIR, key)
  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, body)
  await writeFile(`${abs}.meta`, JSON.stringify({ contentType }), 'utf8')
  return key
}

/** Derives a plausible "before" photograph from a finished render. */
async function stripBack(source: Buffer): Promise<Buffer> {
  return sharp(source)
    .modulate({ saturation: 0.32, brightness: 0.97, hue: -4 })
    .linear(0.88, 14)
    .blur(0.6)
    .webp({ quality: 86 })
    .toBuffer()
}

/* ── seed ─────────────────────────────────────────────────────────────────── */

async function main() {
  if (!existsSync(path.join(GENERATED, 'manifest.json'))) {
    throw new Error(
      'Generated artwork is missing. Run `npm run assets:generate` first.',
    )
  }

  const manifest: Manifest = JSON.parse(
    await readFile(path.join(GENERATED, 'manifest.json'), 'utf8'),
  )

  console.log('· clearing previous seed data…')
  await db.creditTransaction.deleteMany()
  await db.generation.deleteMany()
  await db.design.deleteMany()
  await db.passwordResetToken.deleteMany()
  await db.account.deleteMany()
  await db.user.deleteMany()

  const passwordHash = await bcrypt.hash(PASSWORD, 12)

  console.log('· creating accounts…')
  const admin = await db.user.create({
    data: {
      email: ADMIN_EMAIL,
      name: 'Studio Admin',
      passwordHash,
      role: 'ADMIN',
      plan: 'PRO',
      credits: 100,
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    },
  })

  const demo = await db.user.create({
    data: {
      email: DEMO_EMAIL,
      name: 'Aria Mansouri',
      passwordHash,
      role: 'USER',
      plan: 'FREE',
      credits: 0,
      emailVerifiedAt: new Date(),
      lastLoginAt: new Date(),
    },
  })

  await db.creditTransaction.createMany({
    data: [
      {
        userId: admin.id,
        amount: 100,
        balanceAfter: 100,
        reason: 'PLAN_CHANGE',
        note: 'Pro plan allocation',
      },
      {
        userId: demo.id,
        amount: 20,
        balanceAfter: 20,
        reason: 'SIGNUP_BONUS',
        note: 'Welcome credits on the Free plan',
      },
    ],
  })

  console.log('· building designs from generated artwork…')

  const insightWriter = (item: Manifest['inspirations'][number]) => [
    {
      title: 'Material strategy',
      body: `The ${item.style} language is carried by a small number of finishes, concentrated where the eye lands first so the rest of the room can stay quiet.`,
    },
    {
      title: 'Colour behaviour',
      body: `A ${item.palette} palette holds the walls one step lighter than the floor, which gives the room a base to sit on without darkening it.`,
    },
    {
      title: 'Light and time of day',
      body: `${item.lighting.charAt(0).toUpperCase() + item.lighting.slice(1)} light was chosen so the scheme holds its character across the day rather than only photographing well once.`,
    },
    {
      title: 'Why it feels this way',
      body: `The ${item.mood} result comes from restraint rather than addition — nothing was introduced that the room did not need.`,
    },
  ]

  let balance = 20
  let created = 0

  for (const [index, item] of manifest.inspirations.entries()) {
    const file = path.join(GENERATED, 'inspirations', `${item.slug}.webp`)
    if (!existsSync(file)) continue

    const result = await readFile(file)
    const before = await stripBack(result)
    const meta = await sharp(result).metadata()

    const originalKey = await putObject(
      `uploads/${demo.id}/${randomUUID()}.webp`,
      before,
      'image/webp',
    )
    const resultKey = await putObject(
      `renders/${demo.id}/${randomUUID()}.webp`,
      result,
      'image/webp',
    )

    // Spread the history over the past few weeks so the dashboard reads as a
    // real workspace rather than everything created in the same second.
    const createdAt = new Date(Date.now() - (index * 2.5 + 1) * 86_400_000)

    const design = await db.design.create({
      data: {
        userId: demo.id,
        title: item.title,
        roomType: item.room,
        style: item.style,
        palette: item.palette,
        lighting: item.lighting,
        mood: item.mood,
        originalKey,
        resultKey,
        width: meta.width ?? 1280,
        height: meta.height ?? 960,
        status: 'COMPLETED',
        isFavorite: index % 3 === 0,
        description: `This ${item.room.replace('-', ' ')} was reworked as a ${item.style} interior built on a ${item.palette} palette. ${item.lighting.charAt(0).toUpperCase() + item.lighting.slice(1)} light keeps the material contrast legible, and the result reads as ${item.mood} without losing the room's original proportions.`,
        insights: insightWriter(item) as unknown as Prisma.InputJsonValue,
        createdAt,
        updatedAt: createdAt,
      },
    })

    await db.generation.create({
      data: {
        userId: demo.id,
        designId: design.id,
        provider: 'mock',
        model: 'local-grade-v1',
        prompt: `Interior design photograph of a ${item.room.replace('-', ' ')}. Style: ${item.style}. Palette: ${item.palette}. Lighting: ${item.lighting}. Mood: ${item.mood}.`,
        status: 'COMPLETED',
        durationMs: 3800 + ((index * 617) % 2400),
        creditsUsed: 1,
        createdAt,
      },
    })

    balance -= 1
    await db.creditTransaction.create({
      data: {
        userId: demo.id,
        amount: -1,
        balanceAfter: balance,
        reason: 'GENERATION',
        note: design.title,
        createdAt,
      },
    })

    created += 1
  }

  // One failed generation so the admin reports and the success-rate metric are
  // exercised with something other than a perfect record.
  const failedAt = new Date(Date.now() - 4 * 86_400_000)
  await db.generation.create({
    data: {
      userId: demo.id,
      provider: 'mock',
      status: 'FAILED',
      durationMs: 1180,
      creditsUsed: 0,
      error: 'Source image could not be decoded',
      createdAt: failedAt,
    },
  })

  await db.user.update({ where: { id: demo.id }, data: { credits: balance } })

  console.log(`
  ✓ seed complete

    ${created} designs · ${balance} credits remaining

    admin   ${ADMIN_EMAIL}   ${PASSWORD}
    user    ${DEMO_EMAIL}    ${PASSWORD}
`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
