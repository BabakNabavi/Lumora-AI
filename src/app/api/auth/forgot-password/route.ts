import { appUrl } from '@/lib/env'
import { consume, limits } from '@/lib/rate-limit'
import { forgotPasswordSchema } from '@/lib/validation/schemas'
import { clientKey, ok, route } from '@/server/http'
import { createPasswordResetToken } from '@/server/services/users'

/**
 * Issues a password-reset token.
 *
 * The response is identical whether or not an account exists, so the endpoint
 * cannot be used to discover registered addresses.
 *
 * No transactional email provider is wired up in this build. Rather than
 * pretending an email was sent, the reset link is logged server-side and — in
 * development only — returned in the response so the flow can be completed
 * end to end. Connecting Resend/Postmark means replacing the `console.info`
 * below with a send call; nothing else changes.
 */
export const POST = route(async (request) => {
  consume(`forgot:${clientKey(request)}`, limits.auth)

  const { email } = forgotPasswordSchema.parse(await request.json())
  const issued = await createPasswordResetToken(email)

  if (issued) {
    const link = `${appUrl}/reset-password?token=${issued.token}`
    console.info(`[auth] password reset link for ${email}: ${link}`)

    if (process.env.NODE_ENV !== 'production') {
      return ok({
        ok: true,
        message: 'If that account exists, a reset link is on its way.',
        devResetUrl: link,
      })
    }
  }

  return ok({
    ok: true,
    message: 'If that account exists, a reset link is on its way.',
  })
})
