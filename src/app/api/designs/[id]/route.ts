import { renameDesignSchema } from '@/lib/validation/schemas'
import { ok, requireApiUser, route } from '@/server/http'
import {
  deleteDesign,
  getDesignForUser,
  renameDesign,
} from '@/server/services/designs'

type Context = { params: Promise<{ id: string }> }

export const GET = route(async (_request, context: Context) => {
  const user = await requireApiUser()
  const { id } = await context.params
  return ok({ design: await getDesignForUser(id, user.id) })
})

export const PATCH = route(async (request, context: Context) => {
  const user = await requireApiUser()
  const { id } = await context.params
  const { title } = renameDesignSchema.parse(await request.json())
  return ok({ design: await renameDesign(id, user.id, title) })
})

export const DELETE = route(async (_request, context: Context) => {
  const user = await requireApiUser()
  const { id } = await context.params
  await deleteDesign(id, user.id)
  return ok({ ok: true })
})
