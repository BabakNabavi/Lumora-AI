'use client'

import * as React from 'react'
import Link from 'next/link'
import { RotateCcw } from 'lucide-react'

import { LogoMark } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error('[boundary]', error)
  }, [error])

  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
    >
      <LogoMark className="size-9 text-ink" />

      <p className="eyebrow mt-10">Something went wrong</p>
      <h1 className="mt-5 max-w-lg text-4xl leading-[1.1] sm:text-5xl">
        That did not render
      </h1>
      <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
        An unexpected error interrupted this page. Trying again usually clears
        it — if it does not, the studio itself is still reachable.
      </p>

      {error.digest && (
        <p className="mt-5 font-mono text-xs text-ink-faint">
          Reference: {error.digest}
        </p>
      )}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset}>
          <RotateCcw />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </main>
  )
}
