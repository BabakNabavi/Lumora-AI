import Image from 'next/image'
import Link from 'next/link'

import { Logo } from '@/components/shared/logo'
import { heroPlates } from '@/lib/assets'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { after } = heroPlates()

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Form column */}
      <div className="flex flex-col px-6 py-8 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <Link
            href="/"
            className="text-[0.8125rem] text-ink-muted transition-colors hover:text-ink"
          >
            Back to site
          </Link>
        </header>

        <main
          id="main"
          className="flex flex-1 items-center justify-center py-12"
        >
          <div className="w-full max-w-sm">{children}</div>
        </main>

        <footer className="text-xs text-ink-faint">
          © {new Date().getFullYear()} AI Interior Studio
        </footer>
      </div>

      {/* Image column */}
      <div className="relative hidden overflow-hidden bg-canvas-deep lg:block">
        <Image
          src={after.src}
          alt=""
          aria-hidden
          fill
          sizes="50vw"
          placeholder={after.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={after.blurDataURL}
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal/85 via-charcoal/25 to-transparent" />

        <figure className="absolute inset-x-0 bottom-0 p-12">
          <blockquote className="max-w-md font-display text-2xl leading-snug text-white">
            “The room was always going to work. It just needed someone to see it
            differently.”
          </blockquote>
          <figcaption className="mt-5 text-[0.6875rem] uppercase tracking-[0.18em] text-white/55">
            Japandi · Earthy palette · Warm light
          </figcaption>
        </figure>
      </div>
    </div>
  )
}
