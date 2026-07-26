import { getCurrentUser } from '@/lib/auth/current-user'
import { AppError, ForbiddenError } from '@/lib/errors'
import { consume, limits } from '@/lib/rate-limit'
import { generateSchema } from '@/lib/validation/schemas'
import { clientKey, ok, route } from '@/server/http'
import { consumeDemoGeneration, demoRemaining } from '@/server/services/demo'
import { runGeneration } from '@/server/services/generation'

export const runtime = 'nodejs'
// 60s is the ceiling on Vercel Hobby. Hosted image models can exceed it —
// raise this to 300 on Pro, where fluid compute allows it.
export const maxDuration = 60

/**
 * Runs one AI generation.
 *
 * Signed-in users spend a credit. Guests get the demo allowance instead — the
 * allowance is consumed only after a successful render, so a failure never
 * burns a visitor's single free try.
 */
export const POST = route(async (request) => {
  consume(`generate:${clientKey(request)}`, limits.generate)

  const user = await getCurrentUser()
  const { uploadId, title, seed, ...brief } = generateSchema.parse(
    await request.json(),
  )

  if (!user) {
    const remaining = await demoRemaining()
    if (remaining <= 0) {
      throw new ForbiddenError(
        'You have used your free demo generation. Create an account to keep designing — it comes with 5 more credits.',
      )
    }
  }

  // Guests must only ever generate from their own upload — the key namespace
  // makes that checkable without a database lookup.
  if (!user && !uploadId.startsWith('uploads/guest/')) {
    throw new AppError(
      'That upload belongs to an account. Please sign in to continue.',
      'forbidden',
      403,
    )
  }

  const design = await runGeneration({
    userId: user?.id ?? null,
    brief,
    originalKey: uploadId,
    title,
    seed,
  })

  if (!user) await consumeDemoGeneration()

  return ok({
    design,
    creditsRemaining: user ? Math.max(0, user.credits - 1) : null,
    isDemo: !user,
  })
})
