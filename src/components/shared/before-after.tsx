'use client'

import * as React from 'react'
import Image from 'next/image'
import { MoveHorizontal } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface ComparisonImage {
  src: string
  width?: number
  height?: number
  blurDataURL?: string
}

interface BeforeAfterProps {
  before: ComparisonImage
  after: ComparisonImage
  beforeLabel?: string
  afterLabel?: string
  alt?: string
  /** Starting divider position, 0–100. */
  initial?: number
  className?: string
  priority?: boolean
  sizes?: string
  /** Sweeps the divider in once on mount to advertise the interaction. */
  autoIntro?: boolean
  aspectRatio?: number
}

/**
 * Before / after comparison.
 *
 * Pointer, keyboard and touch all drive the same value. The divider is exposed
 * as a real `role="slider"` so arrow keys, Home and End work and screen readers
 * announce the position — a drag handle that is only usable with a mouse would
 * make the product's central interaction inaccessible.
 */
export function BeforeAfter({
  before,
  after,
  beforeLabel = 'Before',
  afterLabel = 'After',
  alt = 'Interior before and after the AI redesign',
  initial = 50,
  className,
  priority,
  sizes = '(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px',
  autoIntro = false,
  aspectRatio,
}: BeforeAfterProps) {
  const [position, setPosition] = React.useState(autoIntro ? 100 : initial)
  const [dragging, setDragging] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // One-time reveal sweep: opens on the "after" frame, then eases back to the
  // resting split so the control is discovered without a tooltip.
  React.useEffect(() => {
    if (!autoIntro) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let raf = 0
    if (reduce) {
      // Settle to the resting split without animating. Scheduled rather than
      // set synchronously so this stays out of the render commit path.
      raf = requestAnimationFrame(() => setPosition(initial))
      return () => cancelAnimationFrame(raf)
    }

    const timer = window.setTimeout(() => {
      const start = performance.now()
      const from = 100
      const duration = 1100

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const eased = 1 - Math.pow(1 - t, 4)
        setPosition(from + (initial - from) * eased)
        if (t < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, 620)

    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [autoIntro, initial])

  const updateFromClientX = React.useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const next = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, next)))
  }, [])

  const onPointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    updateFromClientX(event.clientX)
  }

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging) return
    updateFromClientX(event.clientX)
  }

  const endDrag = (event: React.PointerEvent) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    const step = event.shiftKey ? 10 : 2
    const map: Record<string, number> = {
      ArrowLeft: -step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowUp: step,
    }

    if (event.key in map) {
      event.preventDefault()
      setPosition((p) => Math.min(100, Math.max(0, p + map[event.key])))
    } else if (event.key === 'Home') {
      event.preventDefault()
      setPosition(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setPosition(100)
    }
  }

  const ratio =
    aspectRatio ??
    (after.width && after.height ? after.width / after.height : 16 / 9)

  return (
    <div
      ref={containerRef}
      className={cn(
        'group relative select-none overflow-hidden rounded-lg bg-canvas-deep',
        dragging ? 'cursor-grabbing' : 'cursor-ew-resize',
        className,
      )}
      style={{ aspectRatio: ratio }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* After — the full frame underneath */}
      <Image
        src={after.src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        placeholder={after.blurDataURL ? 'blur' : 'empty'}
        blurDataURL={after.blurDataURL}
        className="object-cover"
        draggable={false}
      />

      {/* Before — clipped to the divider */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={before.src}
          alt=""
          aria-hidden
          fill
          priority={priority}
          sizes={sizes}
          placeholder={before.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={before.blurDataURL}
          className="object-cover"
          draggable={false}
        />
      </div>

      {/* Labels */}
      <span
        className={cn(
          'pointer-events-none absolute left-4 top-4 rounded-full bg-charcoal/55 px-3 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm transition-opacity duration-300',
          position < 12 && 'opacity-0',
        )}
      >
        {beforeLabel}
      </span>
      <span
        className={cn(
          'pointer-events-none absolute right-4 top-4 rounded-full bg-charcoal/55 px-3 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm transition-opacity duration-300',
          position > 88 && 'opacity-0',
        )}
      >
        {afterLabel}
      </span>

      {/* Divider */}
      <div
        className="pointer-events-none absolute inset-y-0 w-px bg-white/85 shadow-[0_0_14px_rgba(0,0,0,0.35)]"
        style={{ left: `${position}%` }}
      />

      <div
        role="slider"
        tabIndex={0}
        aria-label="Compare the original room with the AI redesign"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={`${Math.round(position)}% of the original photo visible`}
        onKeyDown={onKeyDown}
        className={cn(
          'absolute top-1/2 z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center',
          'rounded-full border border-white/70 bg-white/92 text-charcoal shadow-float backdrop-blur-sm',
          'transition-[transform,box-shadow] duration-200 ease-[var(--ease-out-quint)]',
          'hover:scale-[1.08] focus-visible:scale-[1.08] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50',
          dragging && 'scale-[1.12]',
        )}
        style={{ left: `${position}%` }}
      >
        <MoveHorizontal className="size-4" aria-hidden />
      </div>
    </div>
  )
}
