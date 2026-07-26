import { ok, requireApiUser, route } from '@/server/http'
import { toggleFavorite } from '@/server/services/designs'

export const POST = route(
  async (_request, context: { params: Promise<{ id: string }> }) => {
    const user = await requireApiUser()
    const { id } = await context.params
    return ok({ isFavorite: await toggleFavorite(id, user.id) })
  },
)
