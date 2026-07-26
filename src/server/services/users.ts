import 'server-only'

import { createHash, randomBytes } from 'node:crypto'

import { PLANS, getPlan } from '@/config/design-options'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import type { GoogleProfile } from '@/lib/auth/google'
import { db } from '@/lib/db'
import { AppError, ConflictError, NotFoundError } from '@/lib/errors'

import { grantCredits } from './credits'

const SIGNUP_CREDITS = getPlan('free').credits
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export interface AuthenticatedUser {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'ADMIN'
  plan: 'FREE' | 'PRO'
}

/* ── registration & sign-in ───────────────────────────────────────────────── */

export async function registerUser(params: {
  name: string
  email: string
  password: string
}): Promise<AuthenticatedUser> {
  const email = params.email.toLowerCase()

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    throw new ConflictError(
      'An account already exists for that email. Try signing in instead.',
    )
  }

  const user = await db.user.create({
    data: {
      email,
      name: params.name.trim(),
      passwordHash: await hashPassword(params.password),
      // The materialised balance starts at zero; the ledger grants the bonus so
      // the very first row explains where the credits came from.
      credits: 0,
    },
    select: { id: true, email: true, name: true, role: true, plan: true },
  })

  await grantCredits(
    user.id,
    SIGNUP_CREDITS,
    'SIGNUP_BONUS',
    'Welcome credits on the Free plan',
  )

  return user
}

export async function authenticate(
  email: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      plan: true,
      passwordHash: true,
    },
  })

  // verifyPassword still runs its comparison when the hash is absent, so a
  // missing account and a wrong password take the same time.
  const ok = await verifyPassword(password, user?.passwordHash)
  if (!user || !ok) return null

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  const { passwordHash: _passwordHash, ...rest } = user
  return rest
}

/**
 * Links a Google identity to an account, creating one if needed. An existing
 * email-and-password account is linked rather than duplicated, so signing in
 * with Google after signing up with a password reaches the same designs.
 */
export async function upsertGoogleUser(params: {
  profile: GoogleProfile
  accessToken: string
  refreshToken?: string
  expiresAt?: number
}): Promise<AuthenticatedUser> {
  const { profile } = params

  const linked = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: 'google',
        providerAccountId: profile.sub,
      },
    },
    select: {
      user: {
        select: { id: true, email: true, name: true, role: true, plan: true },
      },
    },
  })

  if (linked?.user) {
    await db.user.update({
      where: { id: linked.user.id },
      data: { lastLoginAt: new Date() },
    })
    return linked.user
  }

  const existing = await db.user.findUnique({ where: { email: profile.email } })

  const user =
    existing ??
    (await (async () => {
      const created = await db.user.create({
        data: {
          email: profile.email,
          name: profile.name ?? profile.email.split('@')[0],
          image: profile.picture,
          emailVerifiedAt: profile.emailVerified ? new Date() : null,
          credits: 0,
        },
      })
      await grantCredits(
        created.id,
        SIGNUP_CREDITS,
        'SIGNUP_BONUS',
        'Welcome credits on the Free plan',
      )
      return created
    })())

  await db.account.create({
    data: {
      userId: user.id,
      provider: 'google',
      providerAccountId: profile.sub,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresAt: params.expiresAt,
    },
  })

  await db.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      image: user.image ?? profile.picture,
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
  }
}

/* ── profile ──────────────────────────────────────────────────────────────── */

export async function updateProfile(userId: string, name: string) {
  return db.user.update({
    where: { id: userId },
    data: { name: name.trim() },
    select: { id: true, name: true, email: true },
  })
}

export async function changePassword(params: {
  userId: string
  currentPassword?: string
  newPassword: string
}): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: params.userId },
    select: { passwordHash: true },
  })
  if (!user) throw new NotFoundError('Account not found.')

  // Accounts created through Google have no password yet — the first one they
  // set does not require the current password.
  if (user.passwordHash) {
    const ok = await verifyPassword(
      params.currentPassword ?? '',
      user.passwordHash,
    )
    if (!ok) {
      throw new AppError(
        'That is not your current password.',
        'invalid_password',
        400,
      )
    }
  }

  await db.user.update({
    where: { id: params.userId },
    data: { passwordHash: await hashPassword(params.newPassword) },
  })
}

/* ── password reset ───────────────────────────────────────────────────────── */

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex')

/**
 * Issues a reset token. Returns null when no account matches — callers must
 * still report success to the user so the form cannot be used to enumerate
 * registered addresses.
 */
export async function createPasswordResetToken(
  email: string,
): Promise<{ token: string; userId: string } | null> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  })
  if (!user) return null

  const token = randomBytes(32).toString('base64url')

  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  })

  return { token, userId: user.id }
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  })

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new AppError(
      'That reset link is no longer valid. Request a new one.',
      'invalid_token',
      400,
    )
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ])
}

/* ── plans ────────────────────────────────────────────────────────────────── */

/**
 * Plan changes go through here rather than being written directly, so the day a
 * payment provider is connected the only change is calling this from a webhook
 * instead of from the settings form.
 */
export async function changePlan(
  userId: string,
  planId: 'free' | 'pro',
): Promise<void> {
  const plan = PLANS.find((p) => p.id === planId)
  if (!plan) throw new NotFoundError('Unknown plan.')

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, credits: true },
  })
  if (!user) throw new NotFoundError('Account not found.')

  await db.user.update({
    where: { id: userId },
    data: { plan: planId === 'pro' ? 'PRO' : 'FREE' },
  })

  // Topping up rather than overwriting keeps unspent credits.
  if (plan.credits > user.credits) {
    await grantCredits(
      userId,
      plan.credits - user.credits,
      'PLAN_CHANGE',
      `Switched to the ${plan.name} plan`,
    )
  }
}
