import 'server-only'

import { labelFor } from '@/config/design-options'
import { db } from '@/lib/db'
import { storage } from '@/lib/storage'

/**
 * Read-only aggregations for the admin panel. Everything here is a query — the
 * admin surface deliberately has no destructive actions.
 */

const DAY_MS = 24 * 60 * 60 * 1000

export async function platformStats() {
  const since = new Date(Date.now() - 30 * DAY_MS)

  const [
    users,
    newUsers,
    designs,
    completed,
    failed,
    generations,
    creditsSpent,
    proUsers,
    avgDuration,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.design.count(),
    db.design.count({ where: { status: 'COMPLETED' } }),
    db.design.count({ where: { status: 'FAILED' } }),
    db.generation.count(),
    db.creditTransaction.aggregate({
      where: { amount: { lt: 0 } },
      _sum: { amount: true },
    }),
    db.user.count({ where: { plan: 'PRO' } }),
    db.generation.aggregate({
      where: { status: 'COMPLETED' },
      _avg: { durationMs: true },
    }),
  ])

  const attempted = completed + failed
  return {
    users,
    newUsers,
    proUsers,
    designs,
    completed,
    failed,
    generations,
    creditsSpent: Math.abs(creditsSpent._sum.amount ?? 0),
    successRate: attempted === 0 ? 100 : Math.round((completed / attempted) * 100),
    avgDurationMs: Math.round(avgDuration._avg.durationMs ?? 0),
  }
}

/** Generation volume per day for the last `days` days, zero-filled. */
export async function generationTimeseries(days = 14) {
  const since = new Date(Date.now() - (days - 1) * DAY_MS)
  since.setHours(0, 0, 0, 0)

  const rows = await db.generation.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, status: true },
  })

  const buckets = new Map<string, { total: number; failed: number }>()
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * DAY_MS)
    buckets.set(d.toISOString().slice(0, 10), { total: 0, failed: 0 })
  }

  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.total += 1
    if (row.status === 'FAILED') bucket.failed += 1
  }

  return [...buckets.entries()].map(([date, v]) => ({ date, ...v }))
}

export async function styleBreakdown() {
  const rows = await db.design.groupBy({
    by: ['style'],
    _count: { style: true },
    orderBy: { _count: { style: 'desc' } },
  })

  const total = rows.reduce((sum, r) => sum + r._count.style, 0)
  return rows.map((r) => ({
    id: r.style,
    label: labelFor('style', r.style),
    count: r._count.style,
    share: total === 0 ? 0 : Math.round((r._count.style / total) * 100),
  }))
}

export async function roomBreakdown() {
  const rows = await db.design.groupBy({
    by: ['roomType'],
    _count: { roomType: true },
    orderBy: { _count: { roomType: 'desc' } },
  })

  const total = rows.reduce((sum, r) => sum + r._count.roomType, 0)
  return rows.map((r) => ({
    id: r.roomType,
    label: labelFor('room', r.roomType),
    count: r._count.roomType,
    share: total === 0 ? 0 : Math.round((r._count.roomType / total) * 100),
  }))
}

export async function listUsers(page = 1, pageSize = 20, search?: string) {
  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  const [total, items] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        credits: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { designs: true, generations: true } },
      },
    }),
  ])

  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}

export async function listAllDesigns(page = 1, pageSize = 24) {
  const driver = storage()

  const [total, rows] = await Promise.all([
    db.design.count(),
    db.design.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { email: true, name: true } } },
    }),
  ])

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    items: rows.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      style: labelFor('style', d.style),
      room: labelFor('room', d.roomType),
      thumbnailUrl: d.resultKey ? driver.url(d.resultKey) : driver.url(d.originalKey),
      owner: d.user?.email ?? 'Guest demo',
      createdAt: d.createdAt,
    })),
  }
}

export async function listGenerations(page = 1, pageSize = 30) {
  const [total, items] = await Promise.all([
    db.generation.count(),
    db.generation.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { email: true } },
        design: { select: { id: true, title: true } },
      },
    }),
  ])

  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) }
}
