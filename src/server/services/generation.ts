import 'server-only'

import { aiProvider, type DesignBrief } from '@/lib/ai'
import { db } from '@/lib/db'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { buildKey, storage } from '@/lib/storage'
import type { DesignView } from '@/types/design'

import { refundCredits, spendCredits } from './credits'
import {
  completeDesign,
  createDesign,
  failDesign,
  toDesignView,
} from './designs'

const CREDIT_COST = 1

export interface RunGenerationInput {
  /** Null for the guest demo — no credit is charged and no owner is recorded. */
  userId: string | null
  brief: DesignBrief
  /** Storage key of an already-uploaded source photograph. */
  originalKey: string
  title?: string
  seed?: number
}

/**
 * Orchestrates one generation end to end.
 *
 * Ordering matters and is deliberate:
 *   1. charge the credit first, so a burst of parallel requests cannot spend
 *      the same balance twice — the ledger transaction is the lock;
 *   2. create the design row as PROCESSING so it is visible while it runs;
 *   3. call the provider;
 *   4. on any failure, mark the design FAILED, refund the credit and record the
 *      failed Generation row — a provider outage must never cost the user.
 */
export async function runGeneration(
  input: RunGenerationInput,
): Promise<DesignView> {
  const { userId, brief, originalKey, title, seed = 0 } = input
  const driver = storage()

  const source = await driver.get(originalKey)
  if (!source) {
    throw new NotFoundError(
      'That upload has expired. Please upload your photo again.',
    )
  }

  if (userId) {
    await spendCredits(userId, CREDIT_COST, 'GENERATION')
  }

  const design = await createDesign({ userId, brief, originalKey, title })
  const provider = aiProvider()
  const startedAt = Date.now()

  try {
    const result = await provider.generate({
      image: { body: source.body, contentType: source.contentType },
      brief,
      seed,
    })

    const resultKey = buildKey('renders', userId, result.image.contentType)
    await driver.put({
      key: resultKey,
      body: result.image.body,
      contentType: result.image.contentType,
    })

    const completed = await completeDesign({
      designId: design.id,
      resultKey,
      width: result.image.width,
      height: result.image.height,
      description: result.description,
      insights: result.insights,
    })

    await db.generation.create({
      data: {
        userId,
        designId: design.id,
        provider: result.provider,
        model: result.model,
        prompt: result.prompt,
        status: 'COMPLETED',
        durationMs: result.durationMs,
        creditsUsed: userId ? CREDIT_COST : 0,
      },
    })

    return toDesignView(completed)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown generation failure'

    await failDesign(design.id, message)

    await db.generation.create({
      data: {
        userId,
        designId: design.id,
        provider: provider.name,
        status: 'FAILED',
        durationMs: Date.now() - startedAt,
        creditsUsed: 0,
        error: message.slice(0, 500),
      },
    })

    if (userId) {
      await refundCredits(
        userId,
        CREDIT_COST,
        `Refund for failed generation ${design.id}`,
      )
    }

    throw error
  }
}

/**
 * Re-runs an existing design's brief, optionally with changes, as a new design.
 * The source photograph is reused so "another version" never asks for a
 * re-upload.
 */
export async function regenerate(params: {
  userId: string
  designId: string
  overrides?: Partial<DesignBrief>
  seed?: number
}): Promise<DesignView> {
  const source = await db.design.findUnique({
    where: { id: params.designId },
  })

  if (!source || source.userId !== params.userId) {
    throw new NotFoundError('That design no longer exists.')
  }
  if (!source.originalKey) {
    throw new ValidationError('That design has no source photograph.')
  }

  const brief: DesignBrief = {
    roomType: (params.overrides?.roomType ?? source.roomType) as DesignBrief['roomType'],
    style: (params.overrides?.style ?? source.style) as DesignBrief['style'],
    palette: (params.overrides?.palette ?? source.palette) as DesignBrief['palette'],
    lighting: (params.overrides?.lighting ?? source.lighting) as DesignBrief['lighting'],
    mood: (params.overrides?.mood ?? source.mood) as DesignBrief['mood'],
  }

  return runGeneration({
    userId: params.userId,
    brief,
    originalKey: source.originalKey,
    title: source.title,
    seed: params.seed ?? Math.floor(Math.random() * 1_000_000) + 1,
  })
}
