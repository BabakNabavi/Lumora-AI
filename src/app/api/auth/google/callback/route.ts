import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import { GOOGLE_STATE_COOKIE, exchangeGoogleCode } from '@/lib/auth/google'
import { createSessionCookie } from '@/lib/auth/session'
import { appUrl } from '@/lib/env'
import { upsertGoogleUser } from '@/server/services/users'

function fail(message: string) {
  return NextResponse.redirect(
    `${appUrl}/login?error=${encodeURIComponent(message)}`,
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const store = await cookies()
  const expected = store.get(GOOGLE_STATE_COOKIE)?.value
  store.delete(GOOGLE_STATE_COOKIE)

  if (url.searchParams.get('error')) {
    return fail('Google sign-in was cancelled.')
  }
  if (!code || !state || !expected || state !== expected) {
    return fail('That sign-in attempt could not be verified. Please try again.')
  }

  try {
    const result = await exchangeGoogleCode(code)
    const user = await upsertGoogleUser(result)

    await createSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
    })

    const encodedNext = state.split('.')[1]
    let next = '/dashboard'
    if (encodedNext) {
      const decoded = Buffer.from(encodedNext, 'base64url').toString('utf8')
      // Only same-origin paths — never redirect to an attacker-supplied host.
      if (decoded.startsWith('/') && !decoded.startsWith('//')) next = decoded
    }

    return NextResponse.redirect(`${appUrl}${next}`)
  } catch (error) {
    console.error('[auth] google callback failed', error)
    return fail('Google sign-in failed. Please try again.')
  }
}
