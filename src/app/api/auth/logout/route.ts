import { destroySessionCookie } from '@/lib/auth/session'
import { ok, route } from '@/server/http'

export const POST = route(async () => {
  await destroySessionCookie()
  return ok({ ok: true })
})
