'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'

/* ── shared plumbing ──────────────────────────────────────────────────────── */

interface ApiError {
  error: string
  code: string
  details?: Record<string, string>
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = new Error((json as ApiError).error ?? 'Something went wrong.')
    ;(error as Error & { details?: Record<string, string> }).details = (
      json as ApiError
    ).details
    throw error
  }
  return json as T
}

function useAuthForm() {
  const [pending, setPending] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const run = React.useCallback(
    async (fn: () => Promise<void>) => {
      setPending(true)
      setFormError(null)
      setErrors({})
      try {
        await fn()
      } catch (error) {
        const details = (error as Error & { details?: Record<string, string> })
          .details
        if (details && Object.keys(details).length > 0) setErrors(details)
        setFormError(error instanceof Error ? error.message : 'Request failed.')
      } finally {
        setPending(false)
      }
    },
    [],
  )

  return { pending, formError, errors, run, setFormError }
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <div
      role="alert"
      className="flex gap-2.5 rounded-md border border-danger/25 bg-danger-soft p-3.5"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
      <p className="text-[0.8125rem] leading-relaxed text-danger">{message}</p>
    </div>
  )
}

function GoogleButton({ next }: { next: string }) {
  return (
    <Button asChild variant="outline" className="w-full">
      <a href={`/api/auth/google?next=${encodeURIComponent(next)}`}>
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z"
          />
        </svg>
        Continue with Google
      </a>
    </Button>
  )
}

function Divider() {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        or
      </span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

/* ═══ Login ════════════════════════════════════════════════════════════════ */

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const { pending, formError, errors, run, setFormError } = useAuthForm()

  const next = params.get('next') ?? '/dashboard'
  const oauthError = params.get('error')

  React.useEffect(() => {
    if (oauthError) setFormError(oauthError)
  }, [oauthError, setFormError])

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    void run(async () => {
      await post('/api/auth/login', {
        email: data.get('email'),
        password: data.get('password'),
      })
      toast.success('Welcome back')
      router.push(next)
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl leading-tight">Sign in</h1>
        <p className="mt-2.5 text-sm text-ink-muted">
          Pick up where you left off.
        </p>
      </header>

      {googleEnabled && (
        <>
          <GoogleButton next={next} />
          <Divider />
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormError message={formError} />

        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-[0.8125rem] font-medium text-ink-body"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-ink-muted underline underline-offset-4 transition-colors hover:text-ink"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={errors.password ? true : undefined}
          />
          {errors.password && (
            <p className="text-xs text-danger">{errors.password}</p>
          )}
        </div>

        <Button type="submit" className="w-full" loading={pending}>
          Sign in
        </Button>
      </form>

      <p className="text-sm text-ink-muted">
        New here?{' '}
        <Link
          href="/signup"
          className="text-ink underline underline-offset-4 hover:text-accent"
        >
          Create an account
        </Link>
      </p>

      <div className="rounded-md border border-line bg-surface-warm p-4">
        <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
          Demo accounts
        </p>
        <p className="mt-2 font-mono text-xs leading-relaxed text-ink-muted">
          demo@interiorstudio.app · Studio2026
          <br />
          admin@interiorstudio.app · Studio2026
        </p>
      </div>
    </div>
  )
}

/* ═══ Sign up ══════════════════════════════════════════════════════════════ */

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const { pending, formError, errors, run } = useAuthForm()

  const next = params.get('next') ?? '/dashboard'

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    void run(async () => {
      await post('/api/auth/signup', {
        name: data.get('name'),
        email: data.get('email'),
        password: data.get('password'),
      })
      toast.success('Account created — 5 credits added')
      router.push(next)
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl leading-tight">Create your account</h1>
        <p className="mt-2.5 text-sm text-ink-muted">
          Five AI generations included, no card required.
        </p>
      </header>

      {googleEnabled && (
        <>
          <GoogleButton next={next} />
          <Divider />
        </>
      )}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormError message={formError} />

        <Field label="Name" htmlFor="name" error={errors.name}>
          <Input name="name" autoComplete="name" placeholder="Your name" required />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        >
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>

        <Button type="submit" className="w-full" loading={pending}>
          Create account
        </Button>
      </form>

      <p className="text-sm text-ink-muted">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-ink underline underline-offset-4 hover:text-accent"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

/* ═══ Forgot password ══════════════════════════════════════════════════════ */

export function ForgotPasswordForm() {
  const { pending, formError, errors, run } = useAuthForm()
  const [sent, setSent] = React.useState<{ devUrl?: string } | null>(null)

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    void run(async () => {
      const result = await post<{ devResetUrl?: string }>(
        '/api/auth/forgot-password',
        { email: data.get('email') },
      )
      setSent({ devUrl: result.devResetUrl })
    })
  }

  if (sent) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl leading-tight">Check your inbox</h1>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
            If an account exists for that address, a reset link is on its way.
            The link is valid for one hour.
          </p>
        </header>

        {sent.devUrl && (
          <div className="rounded-md border border-warning/25 bg-warning-soft p-4">
            <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-warning">
              Development only
            </p>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">
              No email provider is connected in this build, so the link is
              surfaced here instead of being sent.
            </p>
            <Link
              href={sent.devUrl.replace(/^https?:\/\/[^/]+/, '')}
              className="mt-3 block break-all font-mono text-xs text-accent underline underline-offset-4"
            >
              {sent.devUrl}
            </Link>
          </div>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl leading-tight">Reset your password</h1>
        <p className="mt-2.5 text-sm text-ink-muted">
          We will email you a link to choose a new one.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormError message={formError} />

        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Button type="submit" className="w-full" loading={pending}>
          Send reset link
        </Button>
      </form>

      <p className="text-sm text-ink-muted">
        Remembered it?{' '}
        <Link
          href="/login"
          className="text-ink underline underline-offset-4 hover:text-accent"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}

/* ═══ Reset password ═══════════════════════════════════════════════════════ */

export function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { pending, formError, errors, run } = useAuthForm()

  const token = params.get('token') ?? ''

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    void run(async () => {
      await post('/api/auth/reset-password', {
        token,
        password: data.get('password'),
      })
      toast.success('Password updated — sign in with your new password')
      router.push('/login')
    })
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl leading-tight">Link not valid</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          This reset link is missing its token. Request a new one and try again.
        </p>
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl leading-tight">Choose a new password</h1>
        <p className="mt-2.5 text-sm text-ink-muted">
          You will be signed out of nothing else — sessions stay valid.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormError message={formError} />

        <Field
          label="New password"
          htmlFor="password"
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
        >
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
        </Field>

        <Button type="submit" className="w-full" loading={pending}>
          Update password
        </Button>
      </form>
    </div>
  )
}
