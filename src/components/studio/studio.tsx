'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  DownloadButton,
  FavoriteButton,
  RegenerateButton,
  ShareButton,
} from '@/components/design/design-actions'
import { DesignResult } from '@/components/design/design-result'
import { PaletteChoice, PictureChoice, PillChoice } from '@/components/studio/choices'
import { GeneratingScreen } from '@/components/studio/generating'
import { Uploader, type UploadedPhoto } from '@/components/studio/uploader'
import { Button } from '@/components/ui/button'
import {
  LIGHTINGS,
  MOODS,
  PALETTES,
  ROOMS,
  STYLES,
  isLightingId,
  isMoodId,
  isPaletteId,
  isRoomId,
  isStyleId,
  type LightingId,
  type MoodId,
  type PaletteId,
  type RoomId,
  type StyleId,
} from '@/config/design-options'
import type { Plate } from '@/lib/assets'
import { cn } from '@/lib/utils'
import type { DesignView } from '@/types/design'

type Phase = 'building' | 'generating' | 'done'

const STEPS = [
  { id: 'upload', label: 'Upload', title: 'Upload your space' },
  { id: 'room', label: 'Room', title: 'Choose your space' },
  { id: 'style', label: 'Style', title: 'Choose your style' },
  { id: 'customize', label: 'Customize', title: 'Customize the detail' },
  { id: 'generate', label: 'Generate', title: 'Review and generate' },
] as const

type StepId = (typeof STEPS)[number]['id']

export interface StudioProps {
  isSignedIn: boolean
  credits: number
  demoRemaining: number
  roomPlates: Record<string, Plate>
  stylePlates: Record<string, Plate>
}

export function Studio({
  isSignedIn,
  credits,
  demoRemaining,
  roomPlates,
  stylePlates,
}: StudioProps) {
  const router = useRouter()
  const params = useSearchParams()

  const [step, setStep] = React.useState(0)
  const [phase, setPhase] = React.useState<Phase>('building')
  const [photo, setPhoto] = React.useState<UploadedPhoto | null>(null)
  const [design, setDesign] = React.useState<DesignView | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Deep links from the marketing and inspirations pages pre-select the brief.
  // Read once into initial state — search params are available on first render,
  // so there is nothing to synchronise afterwards.
  const [room, setRoom] = React.useState<RoomId | null>(() => {
    const value = params.get('room')
    return value && isRoomId(value) ? value : null
  })
  const [style, setStyle] = React.useState<StyleId | null>(() => {
    const value = params.get('style')
    return value && isStyleId(value) ? value : null
  })
  const [palette, setPalette] = React.useState<PaletteId | null>(() => {
    const value = params.get('palette')
    return value && isPaletteId(value) ? value : 'neutral'
  })
  const [lighting, setLighting] = React.useState<LightingId | null>(() => {
    const value = params.get('lighting')
    return value && isLightingId(value) ? value : 'natural'
  })
  const [mood, setMood] = React.useState<MoodId | null>(() => {
    const value = params.get('mood')
    return value && isMoodId(value) ? value : 'calm'
  })

  const canAdvance: Record<StepId, boolean> = {
    upload: Boolean(photo),
    room: Boolean(room),
    style: Boolean(style),
    customize: Boolean(palette && lighting && mood),
    generate: Boolean(photo && room && style && palette && lighting && mood),
  }

  const current = STEPS[step]
  const outOfCredits = isSignedIn ? credits <= 0 : demoRemaining <= 0

  async function generate() {
    if (!photo || !room || !style || !palette || !lighting || !mood) return

    setError(null)
    setPhase('generating')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: photo.uploadId,
          roomType: room,
          style,
          palette,
          lighting,
          mood,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Generation failed.')

      setDesign(json.design as DesignView)
      setPhase('done')
      router.refresh()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setPhase('building')
      const message =
        err instanceof Error ? err.message : 'Generation failed. Try again.'
      setError(message)
      toast.error(message)
    }
  }

  function startOver() {
    setDesign(null)
    setPhase('building')
    setStep(0)
    setPhoto(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ── generating ─────────────────────────────────────────────────────────── */

  if (phase === 'generating' && photo) {
    return (
      <GeneratingScreen
        previewUrl={photo.url}
        summary={[
          ROOMS.find((r) => r.id === room)?.name ?? '',
          STYLES.find((s) => s.id === style)?.name ?? '',
          PALETTES.find((p) => p.id === palette)?.name ?? '',
          LIGHTINGS.find((l) => l.id === lighting)?.name ?? '',
        ].filter(Boolean)}
      />
    )
  }

  /* ── result ─────────────────────────────────────────────────────────────── */

  if (phase === 'done' && design) {
    return (
      <div className="space-y-10">
        <DesignResult
          design={design}
          eyebrow="Generation complete"
          actions={
            isSignedIn ? (
              <>
                <FavoriteButton design={design} />
                <DownloadButton design={design} />
                <ShareButton design={design} />
                <RegenerateButton design={design} label="Another version" />
              </>
            ) : (
              <>
                <Button asChild>
                  <Link href="/signup">
                    <Sparkles />
                    Create an account to save this
                  </Link>
                </Button>
                <Button variant="outline" onClick={startOver}>
                  Try another room
                </Button>
              </>
            )
          }
        />

        {!isSignedIn && (
          <div className="rounded-lg border border-line bg-surface-warm p-6 sm:p-8">
            <h2 className="font-display text-lg text-ink">
              That was your free demo generation
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              Creating an account keeps this design, adds five more credits, and
              unlocks favourites, share links and downloads at full resolution.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/signup">Create free account</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/login">I already have one</Link>
              </Button>
            </div>
          </div>
        )}

        {isSignedIn && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
            <p className="text-sm text-ink-muted">
              Saved to your dashboard ·{' '}
              <span className="tabular-nums text-ink">
                {Math.max(0, credits - 1)}
              </span>{' '}
              credits remaining
            </p>
            <div className="flex gap-2.5">
              <Button variant="outline" onClick={startOver}>
                Design another room
              </Button>
              <Button asChild variant="ghost">
                <Link href="/dashboard/designs">View all designs</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  /* ── builder ────────────────────────────────────────────────────────────── */

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14">
      <div className="min-w-0 order-2 lg:order-1">
        {/* Step rail — horizontal on mobile, vertical is in the sidebar */}
        <ol className="mb-10 flex items-center gap-2 overflow-x-auto pb-1 lg:hidden">
          {STEPS.map((s, index) => (
            <li key={s.id} className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => index <= step && setStep(index)}
                disabled={index > step}
                className={cn(
                  'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs transition-colors',
                  index === step && 'bg-ink text-canvas',
                  index < step && 'bg-canvas-deep text-ink-body',
                  index > step && 'text-ink-faint',
                )}
              >
                <span className="tabular-nums">{index + 1}</span>
                {s.label}
              </button>
              {index < STEPS.length - 1 && (
                <span className="h-px w-4 bg-line" aria-hidden />
              )}
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="mb-8">
              <p className="eyebrow">
                Step {step + 1} of {STEPS.length}
              </p>
              <h1 className="mt-3 text-3xl leading-tight sm:text-[2.25rem]">
                {current.title}
              </h1>
            </header>

            {current.id === 'upload' && (
              <Uploader value={photo} onChange={setPhoto} />
            )}

            {current.id === 'room' && (
              <PictureChoice
                options={ROOMS}
                value={room}
                onChange={setRoom}
                plates={roomPlates}
                columns="rooms"
              />
            )}

            {current.id === 'style' && (
              <PictureChoice
                options={STYLES}
                value={style}
                onChange={setStyle}
                plates={stylePlates}
                columns="styles"
              />
            )}

            {current.id === 'customize' && (
              <div className="space-y-10">
                <section>
                  <h2 className="eyebrow mb-4">Colour palette</h2>
                  <PaletteChoice
                    options={PALETTES}
                    value={palette}
                    onChange={setPalette}
                  />
                </section>
                <section>
                  <h2 className="eyebrow mb-4">Lighting</h2>
                  <PillChoice
                    options={LIGHTINGS}
                    value={lighting}
                    onChange={setLighting}
                  />
                </section>
                <section>
                  <h2 className="eyebrow mb-4">Mood</h2>
                  <PillChoice options={MOODS} value={mood} onChange={setMood} />
                </section>
              </div>
            )}

            {current.id === 'generate' && (
              <ReviewStep
                photo={photo}
                room={room}
                style={style}
                palette={palette}
                lighting={lighting}
                mood={mood}
                onEdit={setStep}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="mt-8 flex gap-3 rounded-lg border border-danger/25 bg-danger-soft p-4">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-danger"
              aria-hidden
            />
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance[current.id]}
            >
              Continue
              <ArrowRight />
            </Button>
          ) : (
            <Button
              variant="accent"
              size="lg"
              onClick={generate}
              disabled={!canAdvance.generate || outOfCredits}
            >
              <Sparkles />
              Generate design
            </Button>
          )}
        </div>

        {outOfCredits && (
          <p className="mt-4 text-right text-xs text-warning">
            {isSignedIn
              ? 'You are out of credits — switch to Pro to keep generating.'
              : 'You have used your free demo. Create an account for five more credits.'}
          </p>
        )}
      </div>

      <StudioSidebar
        step={step}
        onStep={setStep}
        canAdvance={canAdvance}
        isSignedIn={isSignedIn}
        credits={credits}
        demoRemaining={demoRemaining}
      />
    </div>
  )
}

/* ── review step ────────────────────────────────────────────────────────── */

function ReviewStep({
  photo,
  room,
  style,
  palette,
  lighting,
  mood,
  onEdit,
}: {
  photo: UploadedPhoto | null
  room: RoomId | null
  style: StyleId | null
  palette: PaletteId | null
  lighting: LightingId | null
  mood: MoodId | null
  onEdit: (step: number) => void
}) {
  const rows = [
    { label: 'Room', value: ROOMS.find((r) => r.id === room)?.name, step: 1 },
    { label: 'Style', value: STYLES.find((s) => s.id === style)?.name, step: 2 },
    {
      label: 'Palette',
      value: PALETTES.find((p) => p.id === palette)?.name,
      step: 3,
    },
    {
      label: 'Lighting',
      value: LIGHTINGS.find((l) => l.id === lighting)?.name,
      step: 3,
    },
    { label: 'Mood', value: MOODS.find((m) => m.id === mood)?.name, step: 3 },
  ]

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {photo && (
        <div className="overflow-hidden rounded-lg border border-line bg-canvas-deep">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.url}
            alt="Your uploaded room"
            className="h-full max-h-80 w-full object-cover"
          />
        </div>
      )}

      <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 px-5 py-3.5"
          >
            <dt className="text-[0.8125rem] text-ink-muted">{row.label}</dt>
            <dd className="flex items-center gap-3">
              <span className="text-[0.875rem] text-ink">
                {row.value ?? '—'}
              </span>
              <button
                type="button"
                onClick={() => onEdit(row.step)}
                className="text-[0.6875rem] text-ink-faint underline underline-offset-2 transition-colors hover:text-ink"
              >
                Edit
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

/* ── sidebar ────────────────────────────────────────────────────────────── */

function StudioSidebar({
  step,
  onStep,
  canAdvance,
  isSignedIn,
  credits,
  demoRemaining,
}: {
  step: number
  onStep: (index: number) => void
  canAdvance: Record<StepId, boolean>
  isSignedIn: boolean
  credits: number
  demoRemaining: number
}) {
  return (
    <aside className="order-1 lg:order-2">
      <div className="lg:sticky lg:top-28">
        <ol className="hidden space-y-1 lg:block">
          {STEPS.map((s, index) => {
            const done = index < step && canAdvance[s.id]
            const active = index === step
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => index <= step && onStep(index)}
                  disabled={index > step}
                  className={cn(
                    'flex w-full items-center gap-3.5 rounded-lg px-3 py-2.5 text-left transition-colors',
                    active && 'bg-surface shadow-soft',
                    !active && index <= step && 'hover:bg-canvas-deep',
                    index > step && 'cursor-default opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border text-[0.6875rem] tabular-nums transition-colors',
                      done && 'border-ink bg-ink text-canvas',
                      active && !done && 'border-ink text-ink',
                      !done && !active && 'border-line-strong text-ink-faint',
                    )}
                  >
                    {done ? <Check className="size-3" aria-hidden /> : index + 1}
                  </span>
                  <span
                    className={cn(
                      'text-[0.875rem]',
                      active ? 'text-ink' : 'text-ink-muted',
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="mt-6 rounded-lg border border-line bg-surface p-5">
          <p className="eyebrow">
            {isSignedIn ? 'AI credits' : 'Guest demo'}
          </p>
          <p className="mt-3 font-display text-2xl leading-none text-ink tabular-nums">
            {isSignedIn ? credits : demoRemaining}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-muted">
            {isSignedIn
              ? 'One credit per generation. Failed generations are refunded automatically.'
              : 'One free generation without an account. Sign up for five more.'}
          </p>
          {!isSignedIn && (
            <Button asChild size="sm" variant="outline" className="mt-4 w-full">
              <Link href="/signup">Create free account</Link>
            </Button>
          )}
        </div>
      </div>
    </aside>
  )
}
