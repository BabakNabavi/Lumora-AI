import { AppError } from '@/lib/errors'
import { createSessionCookie } from '@/lib/auth/session'
import { consume, limits } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/validation/schemas'
import { clientKey, ok, route } from '@/server/http'
import { authenticate } from '@/server/services/users'

export const POST = route(async (request) => {
  consume(`login:${clientKey(request)}`, limits.auth)

  const { email, password } = loginSchema.parse(await request.json())
  const user = await authenticate(email, password)

  if (!user) {
    // One message for both "no such account" and "wrong password" — the form
    // must not become an account-enumeration oracle.
    throw new AppError(
      'That email and password combination did not match.',
      'invalid_credentials',
      401,
    )
  }

  await createSessionCookie({
    userId: user.id,
    email: user.email,
    role: user.role,
    plan: user.plan,
  })

  return ok({ user: { id: user.id, email: user.email, name: user.name } })
})
