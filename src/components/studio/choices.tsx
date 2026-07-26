'use client'

import Image from 'next/image'
import { Check } from 'lucide-react'

import type { Plate } from '@/lib/assets'
import { cn } from '@/lib/utils'

/* ═══ Room / style picture cards ═══════════════════════════════════════════ */

export function PictureChoice<T extends string>({
  options,
  value,
  onChange,
  plates,
  columns = 'rooms',
}: {
  options: { id: T; name: string; description?: string; tagline?: string }[]
  value: T | null
  onChange: (id: T) => void
  plates: Record<string, Plate>
  columns?: 'rooms' | 'styles'
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'grid gap-3 sm:gap-4',
        columns === 'rooms'
          ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
      )}
    >
      {options.map((option) => {
        const selected = value === option.id
        const plate = plates[option.id]

        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              'group relative overflow-hidden rounded-lg border bg-surface text-left',
              'transition-[border-color,box-shadow,transform] duration-300 ease-[var(--ease-out-quint)]',
              selected
                ? 'border-ink shadow-lift'
                : 'border-line hover:border-line-strong hover:shadow-soft',
            )}
          >
            <span
              className={cn(
                'relative block overflow-hidden bg-canvas-deep',
                columns === 'styles' ? 'aspect-4/5' : 'aspect-4/3',
              )}
            >
              {plate && (
                <Image
                  src={plate.src}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
                  placeholder={plate.blurDataURL ? 'blur' : 'empty'}
                  blurDataURL={plate.blurDataURL}
                  className={cn(
                    'object-cover transition-transform duration-700 ease-[var(--ease-out-quint)]',
                    selected ? 'scale-105' : 'group-hover:scale-[1.04]',
                  )}
                />
              )}
              <span
                className={cn(
                  'absolute inset-0 transition-opacity duration-500',
                  selected
                    ? 'bg-gradient-to-t from-charcoal/75 to-transparent'
                    : 'bg-gradient-to-t from-charcoal/55 to-transparent',
                )}
              />

              <span
                className={cn(
                  'absolute right-3 top-3 flex size-6 items-center justify-center rounded-full transition-all duration-300',
                  selected
                    ? 'scale-100 bg-white text-charcoal opacity-100'
                    : 'scale-75 bg-white/20 opacity-0',
                )}
              >
                <Check className="size-3.5" aria-hidden />
              </span>

              <span className="absolute inset-x-0 bottom-0 p-4">
                <span className="block font-display text-[0.9375rem] leading-tight text-white">
                  {option.name}
                </span>
                {(option.tagline ?? option.description) && (
                  <span className="mt-1 block line-clamp-2 text-[0.6875rem] leading-snug text-white/70">
                    {option.tagline ?? option.description}
                  </span>
                )}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ═══ Palette choice ═══════════════════════════════════════════════════════ */

export function PaletteChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; name: string; description: string; swatches: string[] }[]
  value: T | null
  onChange: (id: T) => void
}) {
  return (
    <div role="radiogroup" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => {
        const selected = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex items-center gap-4 rounded-lg border p-3.5 text-left transition-all duration-300',
              selected
                ? 'border-ink bg-surface shadow-lift'
                : 'border-line bg-surface hover:border-line-strong hover:shadow-soft',
            )}
          >
            <span className="flex shrink-0 overflow-hidden rounded-md ring-1 ring-black/5">
              {option.swatches.map((hex) => (
                <span
                  key={hex}
                  className="block size-7"
                  style={{ backgroundColor: hex }}
                  aria-hidden
                />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.875rem] font-medium text-ink">
                {option.name}
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink-muted">
                {option.description}
              </span>
            </span>
            <span
              className={cn(
                'flex size-5 shrink-0 items-center justify-center rounded-full border transition-all',
                selected
                  ? 'border-ink bg-ink text-canvas'
                  : 'border-line-strong bg-transparent text-transparent',
              )}
            >
              <Check className="size-3" aria-hidden />
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ═══ Pill choice (lighting, mood) ═════════════════════════════════════════ */

export function PillChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; name: string; description: string }[]
  value: T | null
  onChange: (id: T) => void
}) {
  return (
    <div role="radiogroup" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {options.map((option) => {
        const selected = value === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              'rounded-lg border p-4 text-left transition-all duration-300',
              selected
                ? 'border-ink bg-ink text-canvas shadow-lift'
                : 'border-line bg-surface hover:border-line-strong hover:shadow-soft',
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-[0.875rem] font-medium">{option.name}</span>
              <span
                className={cn(
                  'flex size-5 shrink-0 items-center justify-center rounded-full border transition-all',
                  selected
                    ? 'border-canvas/40 bg-canvas text-ink'
                    : 'border-line-strong text-transparent',
                )}
              >
                <Check className="size-3" aria-hidden />
              </span>
            </span>
            <span
              className={cn(
                'mt-1.5 block text-xs leading-relaxed',
                selected ? 'text-canvas/65' : 'text-ink-muted',
              )}
            >
              {option.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}
