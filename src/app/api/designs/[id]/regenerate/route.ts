import { briefSchema } from '@/lib/validation/schemas'
import { consume, limits } from '@/lib/rate-limit'
import { clientKey, ok, requireApiUser, route } from '@/server/http'
import { regenerate } from '@/server/services/generation'

export const runtime = 'nodejs'
// 60s is the ceiling on Vercel Hobby. Hosted image models can exceed it —
// raise this to 300 on Pro, where fluid compute allows it.
export const maxDuration = 60

/** Re-runs an existing design, optionally with a changed brief. */
export const POST = route(
  async (request, context: { params: Promise<{ id: string }> }) => {
    consume(`generate:${clientKey(request)}`, limits.generate)

    const user = await requireApiUser()
    const { id } = await context.params

    const raw = await request.json().catch(() => ({}))
    const overrides = briefSchema.partial().parse(raw ?? {})

    const design = await regenerate({
      userId: user.id,
      designId: id,
      overrides,
    })

    return ok({ design, creditsRemaining: Math.max(0, user.credits - 1) })
  },
)
