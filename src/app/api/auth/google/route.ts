import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import {
  GOOGLE_STATE_COOKIE,
  googleAuthorizeUrl,
} from '@/lib/auth/google'
import { appUrl, isGoogleEnabled } from '@/lib/env'

export async function GET(request: Request) {
  if (!isGoogleEnabled()) {
    return NextResponse.redirect(
      `${appUrl}/login?error=${encodeURIComponent('Google sign-in is not configured on this deployment.')}`,
    )
  }

  const next = new URL(request.url).searchParams.get('next') ?? '/dashboard'

  // The state carries the post-login destination and doubles as the CSRF nonce.
  const nonce = randomBytes(16).toString('base64url')
  const state = `${nonce}.${Buffer.from(next).toString('base64url')}`

  const store = await cookies()
  store.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  })

  return NextResponse.redirect(googleAuthorizeUrl(state))
}
