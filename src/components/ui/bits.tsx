import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/* ═══ Badge ════════════════════════════════════════════════════════════════ */

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full text-[0.6875rem] font-medium leading-none [&_svg]:size-3',
  {
    variants: {
      variant: {
        neutral: 'bg-canvas-deep text-ink-muted',
        outline: 'border border-line-strong text-ink-muted',
        ink: 'bg-ink text-canvas',
        accent: 'bg-accent-soft text-accent',
        success: 'bg-success-soft text-success',
        warning: 'bg-warning-soft text-warning',
        danger: 'bg-danger-soft text-danger',
      },
      size: {
        sm: 'px-2 py-1',
        md: 'px-2.5 py-1.5',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'sm' },
  },
)

export function Badge({
  className,
  variant,
  size,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

/* ═══ Eyebrow ══════════════════════════════════════════════════════════════ */

export function Eyebrow({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('eyebrow', className)} {...props} />
}

/* ═══ Skeleton ═════════════════════════════════════════════════════════════ */

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton rounded-md', className)} {...props} />
}

/* ═══ Empty state ══════════════════════════════════════════════════════════ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface-warm px-6 py-16 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-canvas-deep text-ink-muted [&_svg]:size-5">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/* ═══ Stat ═════════════════════════════════════════════════════════════════ */

export function Stat({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string
  value: React.ReactNode
  hint?: string
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'group rounded-lg border border-line bg-surface p-5 transition-shadow duration-300 hover:shadow-lift',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        {icon && (
          <span className="text-ink-faint transition-colors group-hover:text-accent [&_svg]:size-4">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-3xl leading-none text-ink tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-ink-faint">{hint}</p>}
    </div>
  )
}

/* ═══ Section heading ══════════════════════════════════════════════════════ */

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  align?: 'left' | 'center'
  className?: string
}) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' && 'mx-auto text-center',
        className,
      )}
    >
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h2 className="text-balance text-3xl leading-[1.12] sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-pretty text-[0.9375rem] leading-relaxed text-ink-muted sm:text-base">
          {description}
        </p>
      )}
    </div>
  )
}
