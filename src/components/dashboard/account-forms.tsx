'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/primitives'
import {
  changePasswordAction,
  changePlanAction,
  deleteAccountAction,
  updateProfileAction,
  type ActionState,
} from '@/server/actions/account'

const EMPTY: ActionState = { ok: false }

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null

  return (
    <p
      role="status"
      className={`flex items-center gap-2 text-[0.8125rem] ${
        state.ok ? 'text-success' : 'text-danger'
      }`}
    >
      {state.ok ? (
        <Check className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
      )}
      {state.message}
    </p>
  )
}

/* ═══ Profile ══════════════════════════════════════════════════════════════ */

export function ProfileForm({
  name,
  email,
}: {
  name: string | null
  email: string
}) {
  const router = useRouter()
  const [state, action, pending] = useActionState(updateProfileAction, EMPTY)

  React.useEffect(() => {
    if (state.ok) router.refresh()
  }, [state, router])

  return (
    <form action={action} className="space-y-5">
      <Field label="Name" htmlFor="name" error={state.errors?.name}>
        <Input name="name" defaultValue={name ?? ''} required />
      </Field>

      <Field
        label="Email"
        htmlFor="email"
        hint="Changing the sign-in address is not available in this build."
      >
        <Input id="email" value={email} disabled readOnly />
      </Field>

      <div className="flex items-center gap-4">
        <Button type="submit" loading={pending}>
          Save changes
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  )
}

/* ═══ Password ═════════════════════════════════════════════════════════════ */

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePasswordAction, EMPTY)
  const formRef = React.useRef<HTMLFormElement>(null)

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={action} className="space-y-5">
      {hasPassword ? (
        <Field
          label="Current password"
          htmlFor="currentPassword"
          error={state.errors?.currentPassword}
        >
          <Input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
      ) : (
        <p className="rounded-md border border-line bg-surface-warm p-3.5 text-[0.8125rem] leading-relaxed text-ink-muted">
          Your account was created with Google, so there is no current password
          to confirm. Setting one lets you sign in either way.
        </p>
      )}

      <Field
        label="New password"
        htmlFor="newPassword"
        error={state.errors?.newPassword}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <div className="flex items-center gap-4">
        <Button type="submit" variant="outline" loading={pending}>
          {hasPassword ? 'Update password' : 'Set password'}
        </Button>
        <Feedback state={state} />
      </div>
    </form>
  )
}

/* ═══ Plan ═════════════════════════════════════════════════════════════════ */

export function PlanSwitchForm({
  plan,
  targetPlan,
  label,
}: {
  plan: 'FREE' | 'PRO'
  targetPlan: 'free' | 'pro'
  label: string
}) {
  const router = useRouter()
  const [state, action, pending] = useActionState(changePlanAction, EMPTY)

  React.useEffect(() => {
    if (state.ok && state.message) {
      toast.success(state.message)
      router.refresh()
    } else if (!state.ok && state.message) {
      toast.error(state.message)
    }
  }, [state, router])

  const isCurrent = (plan === 'PRO') === (targetPlan === 'pro')

  return (
    <form action={action} className="w-full">
      <input type="hidden" name="plan" value={targetPlan} />
      <Button
        type="submit"
        className="w-full"
        variant={targetPlan === 'pro' ? 'accent' : 'outline'}
        loading={pending}
        disabled={isCurrent}
      >
        {isCurrent ? 'Current plan' : label}
      </Button>
    </form>
  )
}

/* ═══ Delete account ═══════════════════════════════════════════════════════ */

export function DeleteAccountDialog({ email }: { email: string }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(deleteAccountAction, EMPTY)

  React.useEffect(() => {
    if (state.ok) {
      toast.success('Account deleted')
      router.push('/')
      router.refresh()
    }
  }, [state, router])

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="danger">Delete account</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Delete your account</DialogTitle>
        <DialogDescription>
          This removes your account, every design you have generated and both
          images for each of them. It cannot be undone.
        </DialogDescription>

        <form action={action} className="mt-6 space-y-5">
          <Field
            label={`Type ${email} to confirm`}
            htmlFor="confirm"
            error={state.errors?.confirm}
          >
            <Input name="confirm" autoComplete="off" placeholder={email} />
          </Field>

          <div className="flex justify-end gap-3">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="danger" loading={pending}>
              Delete permanently
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
