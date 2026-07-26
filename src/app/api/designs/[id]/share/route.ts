import { appUrl } from '@/lib/env'
import { ok, requireApiUser, route } from '@/server/http'
import { createShareLink, revokeShareLink } from '@/server/services/designs'

type Context = { params: Promise<{ id: string }> }

export const POST = route(async (_request, context: Context) => {
  const user = await requireApiUser()
  const { id } = await context.params
  const shareId = await createShareLink(id, user.id)

  return ok({ shareId, url: `${appUrl}/s/${shareId}` })
})

export const DELETE = route(async (_request, context: Context) => {
  const user = await requireApiUser()
  const { id } = await context.params
  await revokeShareLink(id, user.id)
  return ok({ ok: true })
})
