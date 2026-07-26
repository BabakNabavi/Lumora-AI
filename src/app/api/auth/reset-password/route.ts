import { consume, limits } from '@/lib/rate-limit'
import { resetPasswordSchema } from '@/lib/validation/schemas'
import { clientKey, ok, route } from '@/server/http'
import { resetPassword } from '@/server/services/users'

export const POST = route(async (request) => {
  consume(`reset:${clientKey(request)}`, limits.auth)

  const { token, password } = resetPasswordSchema.parse(await request.json())
  await resetPassword(token, password)

  return ok({ ok: true, message: 'Your password has been updated.' })
})
