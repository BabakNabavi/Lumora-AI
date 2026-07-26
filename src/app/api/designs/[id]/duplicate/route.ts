import { ok, requireApiUser, route } from '@/server/http'
import { duplicateDesign, toDesignView } from '@/server/services/designs'

/** Copies a finished design, images included. Costs no credit. */
export const POST = route(
  async (_request, context: { params: Promise<{ id: string }> }) => {
    const user = await requireApiUser()
    const { id } = await context.params
    const copy = await duplicateDesign(id, user.id)
    return ok({ design: toDesignView(copy) }, 201)
  },
)
