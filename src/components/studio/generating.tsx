'use client'

import * as React from 'react'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const STAGES = [
  {
    label: 'Analyzing your space',
    detail: 'Reading the room geometry, openings and camera position.',
    weight: 0.18,
  },
  {
    label: 'Understanding architecture',
    detail: 'Separating what is structural from what is surface.',
    weight: 0.24,
  },
  {
    label: 'Applying selected style',
    detail: 'Mapping materials, palette and lighting onto the plan.',
    weight: 0.32,
  },
  {
    label: 'Creating your new interior',
    detail: 'Rendering the result and writing the design notes.',
    weight: 0.26,
  },
] as const

/** Which stage a 0–1 progress value falls into, by cumulative weight. */
function stageFor(progress: number): number {
  let cumulative = 0
  for (let i = 0; i < STAGES.length; i++) {
    cumulative += STAGES[i].weight
    if (progress < cumulative) return i
  }
  return STAGES.length - 1
}

/**
 * The generation screen.
 *
 * The stage timeline is paced against an expected duration rather than faked
 * frame by frame: it advances smoothly, then holds at the final stage until the
 * request actually resolves. It never reports "done" before the server does.
 */
export function GeneratingScreen({
  previewUrl,
  summary,
  expectedMs = 12_000,
}: {
  previewUrl: string
  summary: string[]
  expectedMs?: number
}) {
  const reduce = useReducedMotion()
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    const start = performance.now()
    let frame = 0
    const tick = (now: number) => {
      setElapsed(now - start)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  // Asymptotic progress: approaches but never reaches 100 until the caller
  // unmounts this screen with a real result.
  const raw = 1 - Math.exp(-elapsed / (expectedMs * 0.55))
  const progress = Math.min(0.985, raw)

  const activeIndex = stageFor(progress)

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
      <div className="relative overflow-hidden rounded-xl border border-line bg-canvas-deep">
        <Image
          src={previewUrl}
          alt=""
          aria-hidden
          width={1200}
          height={900}
          unoptimized
          className="h-full max-h-[30rem] w-full object-cover opacity-90"
        />

        {/* Scanning sweep — the only literal "AI" flourish in the product */}
        {!reduce && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-white/25 to-transparent"
              style={{ animation: 'var(--animate-scan)' }}
            />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-charcoal/60 via-transparent to-charcoal/25" />

        <div className="absolute inset-x-0 bottom-0 p-6">
          <div className="flex flex-wrap gap-2">
            {summary.map((item) => (
              <span
                key={item}
                className="rounded-full bg-charcoal/50 px-3 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-white/85 backdrop-blur-sm"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <p className="eyebrow">Generating</p>
        <h2 className="mt-4 text-3xl leading-tight sm:text-[2.5rem]">
          Reading the room
        </h2>
        <p className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-ink-muted">
          This usually takes under a minute. You can leave this tab — the design
          is saved to your dashboard as soon as it is ready.
        </p>

        <div className="mt-10 h-px w-full bg-line-faint">
          <motion.div
            className="h-px bg-ink"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: 'linear' }}
          />
        </div>

        <ol className="mt-8 space-y-1">
          {STAGES.map((stage, index) => {
            const done = index < activeIndex
            const active = index === activeIndex

            return (
              <li key={stage.label}>
                <div
                  className={cn(
                    'flex items-start gap-4 rounded-lg px-3 py-3.5 transition-colors duration-500',
                    active && 'bg-surface-warm',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-all duration-500',
                      done && 'border-success bg-success text-white',
                      active && 'border-ink text-ink',
                      !done && !active && 'border-line-strong text-ink-faint',
                    )}
                  >
                    {done ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : active ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <span className="size-1.5 rounded-full bg-current" />
                    )}
                  </span>

                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block text-[0.9375rem] transition-colors duration-500',
                        done || active ? 'text-ink' : 'text-ink-faint',
                      )}
                    >
                      {stage.label}
                      {active ? '…' : ''}
                    </span>

                    <AnimatePresence initial={false}>
                      {active && (
                        <motion.span
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="block overflow-hidden text-[0.8125rem] leading-relaxed text-ink-muted"
                        >
                          <span className="block pt-1">{stage.detail}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </div>
              </li>
            )
          })}
        </ol>

        <p
          className="mt-6 text-xs text-ink-faint"
          role="status"
          aria-live="polite"
        >
          {STAGES[activeIndex].label} — step {activeIndex + 1} of{' '}
          {STAGES.length}
        </p>
      </div>
    </div>
  )
}
