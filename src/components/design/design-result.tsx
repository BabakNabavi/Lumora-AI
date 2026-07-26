import Link from 'next/link'
import { Lightbulb } from 'lucide-react'

import { BeforeAfter } from '@/components/shared/before-after'
import { Badge } from '@/components/ui/bits'
import { formatDate } from '@/lib/utils'
import type { DesignView } from '@/types/design'

/* ═══ Brief summary ════════════════════════════════════════════════════════ */

export function DesignSpec({ design }: { design: DesignView }) {
  const rows = [
    { label: 'Room type', value: design.labels.room },
    { label: 'Style', value: design.labels.style },
    { label: 'Lighting', value: design.labels.lighting },
    { label: 'Mood', value: design.labels.mood },
  ]

  return (
    <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-4 px-5 py-3.5"
        >
          <dt className="text-[0.8125rem] text-ink-muted">{row.label}</dt>
          <dd className="text-[0.875rem] text-ink">{row.value}</dd>
        </div>
      ))}

      <div className="flex items-center justify-between gap-4 px-5 py-3.5">
        <dt className="text-[0.8125rem] text-ink-muted">Colour palette</dt>
        <dd className="flex items-center gap-3">
          {design.paletteSwatches.length > 0 && (
            <span
              className="flex overflow-hidden rounded ring-1 ring-black/5"
              aria-hidden
            >
              {design.paletteSwatches.map((hex) => (
                <span
                  key={hex}
                  className="block size-4"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </span>
          )}
          <span className="text-[0.875rem] text-ink">
            {design.labels.palette}
          </span>
        </dd>
      </div>

      <div className="flex items-center justify-between gap-4 px-5 py-3.5">
        <dt className="text-[0.8125rem] text-ink-muted">Created</dt>
        <dd className="text-[0.875rem] text-ink">
          {formatDate(design.createdAt, 'long')}
        </dd>
      </div>
    </dl>
  )
}

/* ═══ Insights ═════════════════════════════════════════════════════════════ */

export function DesignInsights({ design }: { design: DesignView }) {
  if (!design.description && design.insights.length === 0) return null

  return (
    <section aria-labelledby="insights-heading">
      <div className="flex items-center gap-2.5">
        <Lightbulb className="size-4 text-accent" aria-hidden />
        <h2 id="insights-heading" className="eyebrow">
          AI design insights
        </h2>
      </div>

      {design.description && (
        <p className="mt-5 text-pretty text-[1.0625rem] leading-relaxed text-ink-body">
          {design.description}
        </p>
      )}

      {design.insights.length > 0 && (
        <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
          {design.insights.map((insight) => (
            <article key={insight.title} className="bg-surface p-5">
              <h3 className="font-display text-[0.9375rem] text-ink">
                {insight.title}
              </h3>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
                {insight.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

/* ═══ Full result ══════════════════════════════════════════════════════════ */

export function DesignResult({
  design,
  actions,
  headingLevel = 'h1',
  eyebrow = 'Your redesign',
}: {
  design: DesignView
  actions?: React.ReactNode
  headingLevel?: 'h1' | 'h2'
  eyebrow?: string
}) {
  const Heading = headingLevel

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:gap-12">
        <div>
          {design.resultUrl ? (
            <BeforeAfter
              before={{ src: design.originalUrl }}
              after={{ src: design.resultUrl }}
              alt={`${design.title} — before and after`}
              initial={44}
              autoIntro
              priority
              className="shadow-float"
              aspectRatio={
                design.width && design.height
                  ? design.width / design.height
                  : 4 / 3
              }
            />
          ) : (
            <div className="flex aspect-4/3 items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-warm text-sm text-ink-muted">
              This design has not finished rendering.
            </div>
          )}
          <p className="mt-4 text-center text-xs text-ink-faint">
            Drag the handle to compare · ← → to nudge
          </p>
        </div>

        <div className="flex flex-col">
          <p className="eyebrow">{eyebrow}</p>
          <Heading className="mt-4 text-3xl leading-tight sm:text-[2.25rem]">
            {design.title}
          </Heading>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="ink" size="md">
              {design.labels.style}
            </Badge>
            <Badge variant="outline" size="md">
              {design.labels.room}
            </Badge>
            <Badge variant="outline" size="md">
              {design.labels.mood}
            </Badge>
          </div>

          <div className="mt-8">
            <DesignSpec design={design} />
          </div>

          {actions && (
            <div className="mt-8 flex flex-wrap gap-2.5">{actions}</div>
          )}
        </div>
      </div>

      <DesignInsights design={design} />
    </div>
  )
}

/* ═══ Gallery card ═════════════════════════════════════════════════════════ */

export function DesignCardMeta({ design }: { design: DesignView }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="truncate font-display text-[0.9375rem] text-ink">
        <Link href={`/designs/${design.id}`} className="hover:underline">
          {design.title}
        </Link>
      </h3>
      <span className="shrink-0 text-[0.6875rem] text-ink-faint">
        {formatDate(design.createdAt)}
      </span>
    </div>
  )
}
