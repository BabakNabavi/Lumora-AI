import 'server-only'

import { appUrl } from '@/lib/env'

/**
 * Google OAuth 2.0 authorisation-code flow, implemented directly against the
 * endpoints. No adapter library — the flow is three requests, and owning it
 * keeps the session model (our own JWT) unambiguous.
 *
 * CSRF is handled by a signed `state` value round-tripped through a cookie.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

export const GOOGLE_STATE_COOKIE = 'ais_oauth_state'

export function googleRedirectUri(): string {
  return `${appUrl.replace(/\/+$/, '')}/api/auth/google/callback`
}

export function googleAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export interface GoogleProfile {
  sub: string
  email: string
  emailVerified: boolean
  name?: string
  picture?: string
}

export async function exchangeGoogleCode(code: string): Promise<{
  profile: GoogleProfile
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}> {
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    cache: 'no-store',
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: googleRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed: ${await tokenRes.text()}`)
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const profileRes = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: 'no-store',
  })

  if (!profileRes.ok) {
    throw new Error('Could not read the Google profile.')
  }

  const raw = (await profileRes.json()) as {
    sub: string
    email: string
    email_verified?: boolean
    name?: string
    picture?: string
  }

  if (!raw.email) throw new Error('Google account has no email address.')

  return {
    profile: {
      sub: raw.sub,
      email: raw.email.toLowerCase(),
      emailVerified: raw.email_verified !== false,
      name: raw.name,
      picture: raw.picture,
    },
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expires_in
      ? Math.floor(Date.now() / 1000) + tokens.expires_in
      : undefined,
  }
}
