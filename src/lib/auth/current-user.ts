import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'

import { db } from '@/lib/db'
import { readSession } from './session'

export interface CurrentUser {
  id: string
  email: string
  name: string | null
  image: string | null
  role: 'USER' | 'ADMIN'
  plan: 'FREE' | 'PRO'
  credits: number
  createdAt: Date
  hasPassword: boolean
}

/**
 * The authoritative "who is asking" lookup.
 *
 * The JWT is only used to find the row — role, plan and credits always come
 * from the database, so a revoked admin or a spent credit takes effect on the
 * next request rather than at the next login.
 *
 * `cache()` dedupes this across a single render pass, so a layout, a page and
 * three server components share one query.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession()
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      plan: true,
      credits: true,
      createdAt: true,
      passwordHash: true,
    },
  })

  if (!user) return null

  const { passwordHash, ...rest } = user
  return { ...rest, hasPassword: Boolean(passwordHash) }
})

export async function requireUser(redirectTo = '/login'): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect(redirectTo)
  return user
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login?next=/admin')
  if (user.role !== 'ADMIN') redirect('/dashboard')
  return user
}
