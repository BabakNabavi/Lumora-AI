import { createSessionCookie } from '@/lib/auth/session'
import { consume, limits } from '@/lib/rate-limit'
import { signupSchema } from '@/lib/validation/schemas'
import { clientKey, ok, route } from '@/server/http'
import { registerUser } from '@/server/services/users'

export const POST = route(async (request) => {
  consume(`signup:${clientKey(request)}`, limits.auth)

  const input = signupSchema.parse(await request.json())
  const user = await registerUser(input)

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    role: user.role,
    plan: user.plan,
  })

  return ok({ user: { id: user.id, email: user.email, name: user.name } }, 201)
})
