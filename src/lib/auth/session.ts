import { jwtVerify, SignJWT } from 'jose'
import { cookies } from 'next/headers'

/**
 * Stateless sessions.
 *
 * A signed, HTTP-only JWT holds the minimum needed to route a request: user id,
 * role and plan. Everything authoritative is re-read from the database inside
 * server components and route handlers — the token is a routing hint, never the
 * source of truth for permissions.
 *
 * Deliberately edge-compatible (jose + Web Crypto only) so middleware can
 * validate a session without a database round trip.
 */

export const SESSION_COOKIE = 'ais_session'
const ISSUER = 'ai-interior-studio'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 days

export interface SessionPayload {
  userId: string
  email: string
  role: 'USER' | 'ADMIN'
  plan: 'FREE' | 'PRO'
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short (needs at least 32 characters).',
    )
  }
  return new TextEncoder().encode(secret)
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    plan: payload.plan,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(payload.userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey())
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      algorithms: ['HS256'],
    })

    if (!payload.sub || typeof payload.email !== 'string') return null

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role === 'ADMIN' ? 'ADMIN' : 'USER',
      plan: payload.plan === 'PRO' ? 'PRO' : 'FREE',
    }
  } catch {
    return null
  }
}

/* ── cookie helpers (server components / route handlers only) ─────────────── */

export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  return verifySession(store.get(SESSION_COOKIE)?.value)
}

export async function createSessionCookie(
  payload: SessionPayload,
): Promise<void> {
  const token = await signSession(payload)
  const store = await cookies()

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function destroySessionCookie(): Promise<void> {
  const store = await cookies()
  store.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
