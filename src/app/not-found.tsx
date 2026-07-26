import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { LogoMark } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center px-6 text-center"
    >
      <LogoMark className="size-9 text-ink" />

      <p className="eyebrow mt-10">Error 404</p>
      <h1 className="mt-5 max-w-lg text-4xl leading-[1.1] sm:text-5xl">
        This room does not exist
      </h1>
      <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
        The page you were looking for has moved, or the design was deleted by
        its owner.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild>
          <Link href="/">
            <ArrowLeft />
            Back to the studio
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/inspirations">Browse inspirations</Link>
        </Button>
      </div>
    </main>
  )
}
