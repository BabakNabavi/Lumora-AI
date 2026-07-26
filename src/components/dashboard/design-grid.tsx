import Image from 'next/image'
import Link from 'next/link'
import { Heart, ImageOff } from 'lucide-react'

import { Badge } from '@/components/ui/bits'
import { cn, formatDate } from '@/lib/utils'
import type { DesignView } from '@/types/design'

const STATUS_VARIANT = {
  COMPLETED: 'success',
  PROCESSING: 'warning',
  PENDING: 'neutral',
  FAILED: 'danger',
} as const

export function DesignCard({
  design,
  priority,
}: {
  design: DesignView
  priority?: boolean
}) {
  const image = design.resultUrl ?? design.originalUrl

  return (
    <article className="group overflow-hidden rounded-lg border border-line bg-surface shadow-soft transition-shadow duration-500 hover:shadow-lift">
      <Link
        href={`/designs/${design.id}`}
        className="relative block aspect-4/3 overflow-hidden bg-canvas-deep"
      >
        {image ? (
          <Image
            src={image}
            alt={design.title}
            fill
            unoptimized
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.045]"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-ink-faint">
            <ImageOff className="size-6" aria-hidden />
          </span>
        )}

        <span className="absolute inset-0 bg-gradient-to-t from-charcoal/45 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {design.isFavorite && (
          <span
            className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-white/90 text-accent backdrop-blur-sm"
            aria-label="Favourite"
          >
            <Heart className="size-3.5 fill-current" aria-hidden />
          </span>
        )}

        {design.status !== 'COMPLETED' && (
          <span className="absolute left-3 top-3">
            <Badge variant={STATUS_VARIANT[design.status]}>
              {design.status.toLowerCase()}
            </Badge>
          </span>
        )}
      </Link>

      <div className="p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate font-display text-[0.9375rem] text-ink">
            <Link
              href={`/designs/${design.id}`}
              className="transition-colors hover:text-accent"
            >
              {design.title}
            </Link>
          </h3>
          <span className="shrink-0 text-[0.6875rem] text-ink-faint">
            {formatDate(design.createdAt)}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="truncate text-xs text-ink-muted">
            {design.labels.style} · {design.labels.room}
          </p>
          {design.paletteSwatches.length > 0 && (
            <span
              className="flex shrink-0 overflow-hidden rounded ring-1 ring-black/5"
              aria-hidden
            >
              {design.paletteSwatches.map((hex) => (
                <span
                  key={hex}
                  className="block size-3"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

export function DesignGrid({
  designs,
  className,
}: {
  designs: DesignView[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid gap-5 sm:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      {designs.map((design, index) => (
        <DesignCard key={design.id} design={design} priority={index < 3} />
      ))}
    </div>
  )
}

export function Pagination({
  page,
  pageCount,
  basePath,
  query = {},
}: {
  page: number
  pageCount: number
  basePath: string
  query?: Record<string, string | undefined>
}) {
  if (pageCount <= 1) return null

  const build = (target: number) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value)
    }
    if (target > 1) params.set('page', String(target))
    const qs = params.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  return (
    <nav
      className="mt-10 flex items-center justify-center gap-2"
      aria-label="Pagination"
    >
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
        <Link
          key={n}
          href={build(n)}
          aria-current={n === page ? 'page' : undefined}
          className={cn(
            'flex size-9 items-center justify-center rounded-full text-[0.8125rem] tabular-nums transition-colors',
            n === page
              ? 'bg-ink text-canvas'
              : 'text-ink-muted hover:bg-canvas-deep hover:text-ink',
          )}
        >
          {n}
        </Link>
      ))}
    </nav>
  )
}
