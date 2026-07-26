import Link from 'next/link'

import { cn } from '@/lib/utils'

/**
 * The studio mark: an aperture inside a frame — a room, and the light entering
 * it. Drawn as inline SVG so it inherits colour and never costs a request.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn('size-8', className)}
    >
      <rect
        x="1.25"
        y="1.25"
        width="29.5"
        height="29.5"
        rx="2"
        className="stroke-current"
        strokeWidth="1.5"
        opacity="0.35"
      />
      <path
        d="M8 24.5 L16 8.5 L24 24.5 Z"
        className="fill-accent"
        opacity="0.92"
      />
      <path
        d="M16 8.5 L24 24.5 L16 24.5 Z"
        className="fill-current"
        opacity="0.22"
      />
    </svg>
  )
}

export function Logo({
  className,
  href = '/',
  compact = false,
}: {
  className?: string
  href?: string
  compact?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-2.5 text-ink transition-opacity hover:opacity-80',
        className,
      )}
      aria-label="AI Interior Studio — home"
    >
      <LogoMark className="size-7 transition-transform duration-500 ease-[var(--ease-out-quint)] group-hover:rotate-[-4deg]" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[0.9375rem] tracking-tight">
            AI Interior Studio
          </span>
          {/* The tagline is the first thing to go on narrow screens — the
              header has to fit a CTA and a menu button beside it at 390px. */}
          <span className="mt-1 hidden text-[0.5625rem] font-medium uppercase tracking-[0.22em] text-ink-faint sm:block">
            Reimagine your space
          </span>
        </span>
      )}
    </Link>
  )
}
