'use server'

import { revalidatePath } from 'next/cache'

import { requireUser } from '@/lib/auth/current-user'
import { createSessionCookie, destroySessionCookie } from '@/lib/auth/session'
import { AppError } from '@/lib/errors'
import {
  changePasswordSchema,
  fieldErrors,
  updateProfileSchema,
} from '@/lib/validation/schemas'
import { changePassword, changePlan, updateProfile } from '@/server/services/users'
import { db } from '@/lib/db'
import { ZodError } from 'zod'

export interface ActionState {
  ok: boolean
  message?: string
  errors?: Record<string, string>
}

/** Shared error funnel so every action returns the same shape to `useActionState`. */
async function attempt(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        message: 'Please check the highlighted fields.',
        errors: fieldErrors(error),
      }
    }
    if (error instanceof AppError) {
      return { ok: false, message: error.message }
    }
    console.error('[action]', error)
    return { ok: false, message: 'Something went wrong. Please try again.' }
  }
}

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return attempt(async () => {
    const user = await requireUser()
    const { name } = updateProfileSchema.parse({ name: formData.get('name') })

    await updateProfile(user.id, name)
    revalidatePath('/dashboard/settings')

    return { ok: true, message: 'Profile updated.' }
  })
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return attempt(async () => {
    const user = await requireUser()
    const input = changePasswordSchema.parse({
      currentPassword: (formData.get('currentPassword') as string) || undefined,
      newPassword: formData.get('newPassword'),
    })

    await changePassword({
      userId: user.id,
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    })

    return { ok: true, message: 'Password updated.' }
  })
}

export async function changePlanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return attempt(async () => {
    const user = await requireUser()
    const plan = formData.get('plan') === 'pro' ? 'pro' : 'free'

    if ((user.plan === 'PRO') === (plan === 'pro')) {
      return { ok: true, message: 'You are already on that plan.' }
    }

    await changePlan(user.id, plan)

    // The session carries the plan for edge routing, so it has to be reissued.
    await createSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: plan === 'pro' ? 'PRO' : 'FREE',
    })

    revalidatePath('/dashboard/credits')
    revalidatePath('/dashboard')

    return {
      ok: true,
      message:
        plan === 'pro'
          ? 'Switched to Pro — credits topped up to 100.'
          : 'Switched back to the Free plan.',
    }
  })
}

/**
 * Deletes the account and everything attached to it. The cascade rules on the
 * schema remove designs, generations and ledger rows in one statement.
 */
export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return attempt(async () => {
    const user = await requireUser()

    if (formData.get('confirm') !== user.email) {
      return {
        ok: false,
        message: 'Type your email address exactly to confirm.',
        errors: { confirm: 'That does not match your email address.' },
      }
    }

    await db.user.delete({ where: { id: user.id } })
    await destroySessionCookie()

    return { ok: true, message: 'Your account has been deleted.' }
  })
}
