import 'server-only'

import { randomBytes } from 'node:crypto'

import type { Design, DesignStatus, Prisma } from '@prisma/client'

import { getPalette, labelFor } from '@/config/design-options'
import type { DesignBrief, DesignInsight } from '@/lib/ai/types'
import { db } from '@/lib/db'
import { ForbiddenError, NotFoundError } from '@/lib/errors'
import { buildKey, storage } from '@/lib/storage'
import type { DesignListResult, DesignView } from '@/types/design'

/* ── mapping ──────────────────────────────────────────────────────────────── */

function readInsights(value: Prisma.JsonValue | null): DesignInsight[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is { title: string; body: string } =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>).title === 'string' &&
      typeof (item as Record<string, unknown>).body === 'string',
  )
}

export function toDesignView(design: Design): DesignView {
  const driver = storage()

  return {
    id: design.id,
    title: design.title,

    roomType: design.roomType,
    style: design.style,
    palette: design.palette,
    lighting: design.lighting,
    mood: design.mood,

    labels: {
      room: labelFor('room', design.roomType),
      style: labelFor('style', design.style),
      palette: labelFor('palette', design.palette),
      lighting: labelFor('lighting', design.lighting),
      mood: labelFor('mood', design.mood),
    },

    paletteSwatches: getPalette(design.palette)?.swatches ?? [],

    originalUrl: driver.url(design.originalKey),
    resultUrl: design.resultKey ? driver.url(design.resultKey) : null,

    width: design.width,
    height: design.height,

    status: design.status,
    description: design.description,
    insights: readInsights(design.insights),

    isFavorite: design.isFavorite,
    shareId: design.shareId,

    createdAt: design.createdAt.toISOString(),
    updatedAt: design.updatedAt.toISOString(),
  }
}

/* ── titles ───────────────────────────────────────────────────────────────── */

/** "Japandi Living Room" — readable in a gallery without opening it. */
export function defaultTitle(brief: DesignBrief): string {
  return `${labelFor('style', brief.style)} ${labelFor('room', brief.roomType)}`
}

/* ── commands ─────────────────────────────────────────────────────────────── */

export async function createDesign(params: {
  userId: string | null
  brief: DesignBrief
  originalKey: string
  title?: string
}): Promise<Design> {
  return db.design.create({
    data: {
      userId: params.userId,
      title: params.title?.trim() || defaultTitle(params.brief),
      roomType: params.brief.roomType,
      style: params.brief.style,
      palette: params.brief.palette,
      lighting: params.brief.lighting,
      mood: params.brief.mood,
      originalKey: params.originalKey,
      status: 'PROCESSING',
    },
  })
}

export async function completeDesign(params: {
  designId: string
  resultKey: string
  width: number
  height: number
  description: string
  insights: DesignInsight[]
}): Promise<Design> {
  return db.design.update({
    where: { id: params.designId },
    data: {
      resultKey: params.resultKey,
      width: params.width,
      height: params.height,
      description: params.description,
      insights: params.insights as unknown as Prisma.InputJsonValue,
      status: 'COMPLETED',
    },
  })
}

export async function failDesign(
  designId: string,
  _reason: string,
): Promise<void> {
  await db.design.update({
    where: { id: designId },
    data: { status: 'FAILED' satisfies DesignStatus },
  })
}

export async function toggleFavorite(
  designId: string,
  userId: string,
): Promise<boolean> {
  const design = await requireOwned(designId, userId)
  const updated = await db.design.update({
    where: { id: design.id },
    data: { isFavorite: !design.isFavorite },
    select: { isFavorite: true },
  })
  return updated.isFavorite
}

export async function renameDesign(
  designId: string,
  userId: string,
  title: string,
): Promise<DesignView> {
  await requireOwned(designId, userId)
  const updated = await db.design.update({
    where: { id: designId },
    data: { title: title.trim().slice(0, 120) || 'Untitled design' },
  })
  return toDesignView(updated)
}

/** Removes the database row and both objects from storage. */
export async function deleteDesign(
  designId: string,
  userId: string,
): Promise<void> {
  const design = await requireOwned(designId, userId)
  const driver = storage()

  await db.design.delete({ where: { id: design.id } })

  await Promise.allSettled([
    driver.delete(design.originalKey),
    design.resultKey ? driver.delete(design.resultKey) : Promise.resolve(),
  ])
}

/**
 * Duplicates a finished design so it can be renamed and kept as a variant —
 * free, because nothing is generated.
 *
 * The stored objects are copied rather than referenced: two rows sharing one
 * key would mean deleting either copy destroys the other's images.
 */
export async function duplicateDesign(
  designId: string,
  userId: string,
): Promise<Design> {
  const source = await requireOwned(designId, userId)
  const driver = storage()

  const original = await driver.get(source.originalKey)
  if (!original) {
    throw new NotFoundError('The source photograph is no longer available.')
  }

  const originalKey = buildKey('uploads', userId, original.contentType)
  await driver.put({
    key: originalKey,
    body: original.body,
    contentType: original.contentType,
  })

  let resultKey: string | null = null
  if (source.resultKey) {
    const rendered = await driver.get(source.resultKey)
    if (rendered) {
      resultKey = buildKey('renders', userId, rendered.contentType)
      await driver.put({
        key: resultKey,
        body: rendered.body,
        contentType: rendered.contentType,
      })
    }
  }

  return db.design.create({
    data: {
      userId,
      title: `${source.title} (copy)`,
      roomType: source.roomType,
      style: source.style,
      palette: source.palette,
      lighting: source.lighting,
      mood: source.mood,
      originalKey,
      resultKey,
      width: source.width,
      height: source.height,
      description: source.description,
      insights: source.insights ?? undefined,
      status: resultKey ? 'COMPLETED' : 'PENDING',
    },
  })
}

export async function createShareLink(
  designId: string,
  userId: string,
): Promise<string> {
  const design = await requireOwned(designId, userId)
  if (design.shareId) return design.shareId

  const shareId = randomBytes(12).toString('base64url')
  await db.design.update({ where: { id: design.id }, data: { shareId } })
  return shareId
}

export async function revokeShareLink(
  designId: string,
  userId: string,
): Promise<void> {
  await requireOwned(designId, userId)
  await db.design.update({ where: { id: designId }, data: { shareId: null } })
}

/* ── queries ──────────────────────────────────────────────────────────────── */

export async function requireOwned(
  designId: string,
  userId: string,
): Promise<Design> {
  const design = await db.design.findUnique({ where: { id: designId } })
  if (!design) throw new NotFoundError('That design no longer exists.')
  if (design.userId !== userId) {
    throw new ForbiddenError('That design belongs to another account.')
  }
  return design
}

export async function getDesignForUser(
  designId: string,
  userId: string,
): Promise<DesignView> {
  return toDesignView(await requireOwned(designId, userId))
}

export async function getSharedDesign(
  shareId: string,
): Promise<DesignView | null> {
  const design = await db.design.findUnique({ where: { shareId } })
  return design ? toDesignView(design) : null
}

export interface ListDesignsOptions {
  userId: string
  page?: number
  pageSize?: number
  favoritesOnly?: boolean
  style?: string
  roomType?: string
  search?: string
}

export async function listDesigns({
  userId,
  page = 1,
  pageSize = 12,
  favoritesOnly = false,
  style,
  roomType,
  search,
}: ListDesignsOptions): Promise<DesignListResult> {
  const where: Prisma.DesignWhereInput = {
    userId,
    ...(favoritesOnly ? { isFavorite: true } : {}),
    ...(style ? { style } : {}),
    ...(roomType ? { roomType } : {}),
    ...(search
      ? { title: { contains: search.trim(), mode: 'insensitive' as const } }
      : {}),
  }

  const safePage = Math.max(1, page)
  const [total, rows] = await Promise.all([
    db.design.count({ where }),
    db.design.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return {
    items: rows.map(toDesignView),
    total,
    page: safePage,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export async function dashboardOverview(userId: string) {
  const [total, favorites, completed, recent, styleGroups] = await Promise.all([
    db.design.count({ where: { userId } }),
    db.design.count({ where: { userId, isFavorite: true } }),
    db.design.count({ where: { userId, status: 'COMPLETED' } }),
    db.design.findMany({
      where: { userId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    db.design.groupBy({
      by: ['style'],
      where: { userId },
      _count: { style: true },
      orderBy: { _count: { style: 'desc' } },
      take: 1,
    }),
  ])

  return {
    total,
    favorites,
    completed,
    topStyle: styleGroups[0]?.style ?? null,
    recent: recent.map(toDesignView),
  }
}
