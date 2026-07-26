import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowRight,
  Check,
  Palette,
  Sparkles,
  SlidersHorizontal,
  Upload,
  Wand2,
} from 'lucide-react'

import { BeforeAfter } from '@/components/shared/before-after'
import { Reveal, RevealGroup, RevealItem } from '@/components/shared/motion'
import { Badge, SectionHeading } from '@/components/ui/bits'
import { Button } from '@/components/ui/button'
import { PALETTES, PLANS, ROOMS, STYLES } from '@/config/design-options'
import type { Plate } from '@/lib/assets'
import { cn } from '@/lib/utils'

/* ═══ Interactive preview ══════════════════════════════════════════════════ */

export function PreviewSection({
  before,
  after,
}: {
  before: Plate
  after: Plate
}) {
  return (
    <section className="border-y border-line bg-surface-warm py-20 lg:py-28">
      <div className="container-studio">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-16">
          <Reveal>
            <SectionHeading
              eyebrow="Interactive preview"
              title="Drag to see the difference"
              description="This is the same room, before and after a generation. Move the divider — or use the arrow keys — to compare the original photograph with the AI result."
            />
            <div className="mt-8 flex flex-wrap gap-2">
              {['Japandi', 'Earthy palette', 'Soft light', 'Calm'].map(
                (tag) => (
                  <Badge key={tag} variant="outline" size="md">
                    {tag}
                  </Badge>
                ),
              )}
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <BeforeAfter
              before={before}
              after={after}
              autoIntro
              initial={46}
              className="shadow-float"
              aspectRatio={16 / 9}
            />
            <p className="mt-4 text-center text-xs text-ink-faint">
              Drag the handle, or focus it and use ← →
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/* ═══ How it works ═════════════════════════════════════════════════════════ */

const STEPS = [
  {
    icon: Upload,
    title: 'Upload your space',
    body: 'Drop in a photograph of the room as it is today. JPG, PNG or WEBP, up to 12 MB.',
  },
  {
    icon: Sparkles,
    title: 'Choose the room',
    body: 'Living room, bedroom, kitchen, office and more — this tells the model what the space is for.',
  },
  {
    icon: Palette,
    title: 'Pick a style',
    body: 'Eight directions, from disciplined Minimal to material-rich Luxury and warm Japandi.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Tune the details',
    body: 'Palette, lighting and mood. Three small decisions that change the result completely.',
  },
  {
    icon: Wand2,
    title: 'Generate and compare',
    body: 'Watch the analysis run, then compare the result against your original side by side.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 lg:py-28">
      <div className="container-studio">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="Five steps, about a minute"
            description="The studio is a guided flow rather than a prompt box. Every choice is a design decision, not a parameter."
            align="center"
          />
        </Reveal>

        <RevealGroup className="mt-16 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((step, index) => (
            <RevealItem key={step.title}>
              <div className="group h-full bg-surface p-7 transition-colors duration-500 hover:bg-surface-warm">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-full bg-canvas-deep text-ink transition-colors duration-500 group-hover:bg-ink group-hover:text-canvas">
                    <step.icon className="size-4" aria-hidden />
                  </span>
                  <span className="font-display text-sm text-ink-faint">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-[1.0625rem] leading-snug text-ink">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

/* ═══ Styles ═══════════════════════════════════════════════════════════════ */

export function StylesSection({
  plates,
}: {
  plates: Record<string, Plate>
}) {
  return (
    <section id="styles" className="border-y border-line bg-canvas-deep/40 py-20 lg:py-28">
      <div className="container-studio">
        <Reveal>
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="The library"
              title="Eight directions"
              description="Each style carries its own material palette, lighting behaviour and detail vocabulary — they are not filters over the same render."
            />
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/studio">
                Try a style
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>

        <RevealGroup
          stagger={0.05}
          className="mt-14 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          {STYLES.map((style) => {
            const plate = plates[style.id]
            return (
              <RevealItem key={style.id}>
                <Link
                  href={`/studio?style=${style.id}`}
                  className="group block overflow-hidden rounded-lg bg-surface shadow-soft transition-shadow duration-500 hover:shadow-float"
                >
                  <div className="relative aspect-4/5 overflow-hidden bg-canvas-deep">
                    <Image
                      src={plate.src}
                      alt={`${style.name} interior`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
                      placeholder={plate.blurDataURL ? 'blur' : 'empty'}
                      blurDataURL={plate.blurDataURL}
                      className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/70 via-charcoal/5 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <h3 className="font-display text-lg text-white">
                        {style.name}
                      </h3>
                      <p className="mt-1 text-[0.75rem] leading-snug text-white/70">
                        {style.tagline}
                      </p>
                    </div>
                  </div>
                </Link>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </div>
    </section>
  )
}

/* ═══ Rooms ════════════════════════════════════════════════════════════════ */

export function RoomsSection({ plates }: { plates: Record<string, Plate> }) {
  return (
    <section className="py-20 lg:py-28">
      <div className="container-studio">
        <Reveal>
          <SectionHeading
            eyebrow="Room types"
            title="Built for the rooms people actually redesign"
            description="Telling the model what a space is for changes what it puts in it — a kitchen gets continuous surfaces and task light, a bedroom gets layered textiles and a low horizon."
          />
        </Reveal>

        <RevealGroup
          stagger={0.04}
          className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7"
        >
          {ROOMS.map((room) => {
            const plate = plates[room.id]
            return (
              <RevealItem key={room.id}>
                <Link
                  href={`/studio?room=${room.id}`}
                  className="group block"
                >
                  <div className="relative aspect-square overflow-hidden rounded-md bg-canvas-deep">
                    <Image
                      src={plate.src}
                      alt={room.name}
                      fill
                      sizes="(max-width: 768px) 45vw, 14vw"
                      placeholder={plate.blurDataURL ? 'blur' : 'empty'}
                      blurDataURL={plate.blurDataURL}
                      className="object-cover transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-3 text-[0.8125rem] text-ink-body transition-colors group-hover:text-ink">
                    {room.name}
                  </p>
                </Link>
              </RevealItem>
            )
          })}
        </RevealGroup>
      </div>
    </section>
  )
}

/* ═══ Palettes strip ═══════════════════════════════════════════════════════ */

export function PalettesSection() {
  return (
    <section className="border-y border-line bg-surface-warm py-20 lg:py-24">
      <div className="container-studio">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
          <Reveal>
            <SectionHeading
              eyebrow="Colour"
              title="Five palettes, one decision"
              description="The palette is applied as a tonal relationship rather than a colour swap — walls, floor and textiles move together so the room keeps a base to sit on."
            />
          </Reveal>

          <RevealGroup stagger={0.06} className="space-y-3">
            {PALETTES.map((palette) => (
              <RevealItem key={palette.id}>
                <div className="flex items-center gap-5 rounded-lg border border-line bg-surface p-4 transition-shadow duration-300 hover:shadow-soft">
                  <div className="flex shrink-0 overflow-hidden rounded-md">
                    {palette.swatches.map((hex) => (
                      <span
                        key={hex}
                        className="block size-9 sm:size-10"
                        style={{ backgroundColor: hex }}
                        aria-hidden
                      />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display text-[0.9375rem] text-ink">
                      {palette.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {palette.description}
                    </p>
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}

/* ═══ Pricing ══════════════════════════════════════════════════════════════ */

export function PricingSection() {
  return (
    <section id="pricing" className="py-20 lg:py-28">
      <div className="container-studio">
        <Reveal>
          <SectionHeading
            eyebrow="Credits"
            title="One credit, one generation"
            description="Every render costs a single credit. A failed generation is refunded automatically — a provider outage should never cost you anything."
            align="center"
          />
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-3xl gap-5 sm:grid-cols-2">
          {PLANS.map((plan, index) => {
            const featured = plan.id === 'pro'
            return (
              <Reveal key={plan.id} delay={index * 0.08}>
                <div
                  className={cn(
                    'flex h-full flex-col rounded-lg border p-7',
                    featured
                      ? 'border-ink/15 bg-ink text-canvas shadow-float'
                      : 'border-line bg-surface shadow-soft',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p
                        className={cn(
                          'eyebrow',
                          featured && 'text-canvas/55',
                        )}
                      >
                        {plan.name}
                      </p>
                      <p
                        className={cn(
                          'mt-3 font-display text-3xl leading-none',
                          featured ? 'text-canvas' : 'text-ink',
                        )}
                      >
                        {plan.price === 0 ? 'Free' : `$${plan.price}`}
                        {plan.price > 0 && (
                          <span
                            className={cn(
                              'ml-1.5 text-sm',
                              featured ? 'text-canvas/55' : 'text-ink-faint',
                            )}
                          >
                            /month
                          </span>
                        )}
                      </p>
                    </div>
                    {featured && <Badge variant="accent">Most capable</Badge>}
                  </div>

                  <p
                    className={cn(
                      'mt-4 text-sm',
                      featured ? 'text-canvas/70' : 'text-ink-muted',
                    )}
                  >
                    {plan.tagline}
                  </p>

                  <ul className="mt-7 flex-1 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-3 text-sm">
                        <Check
                          className={cn(
                            'mt-0.5 size-4 shrink-0',
                            featured ? 'text-accent' : 'text-success',
                          )}
                          aria-hidden
                        />
                        <span
                          className={
                            featured ? 'text-canvas/85' : 'text-ink-body'
                          }
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className="mt-8 w-full"
                    variant={featured ? 'accent' : 'outline'}
                  >
                    <Link href={featured ? '/dashboard/credits' : '/signup'}>
                      {featured ? 'Switch to Pro' : 'Create free account'}
                    </Link>
                  </Button>
                </div>
              </Reveal>
            )
          })}
        </div>

        <p className="mt-8 text-center text-xs text-ink-faint">
          Payments are not connected in this build — plan changes are applied
          directly so the flow can be explored end to end.
        </p>
      </div>
    </section>
  )
}

/* ═══ Closing CTA ══════════════════════════════════════════════════════════ */

export function CtaSection({ plate }: { plate: Plate }) {
  return (
    <section className="pb-24 lg:pb-32">
      <div className="container-studio">
        <Reveal>
          <div className="relative overflow-hidden rounded-xl bg-charcoal">
            <Image
              src={plate.src}
              alt=""
              aria-hidden
              fill
              sizes="100vw"
              placeholder={plate.blurDataURL ? 'blur' : 'empty'}
              blurDataURL={plate.blurDataURL}
              className="object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-charcoal/90 via-charcoal/70 to-charcoal/30" />

            <div className="relative px-8 py-20 sm:px-14 lg:px-20 lg:py-28">
              <p className="eyebrow text-white/50">Start free</p>
              <h2 className="mt-5 max-w-xl text-3xl leading-[1.1] text-white sm:text-4xl lg:text-5xl">
                Your room already has good bones.
              </h2>
              <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-white/70">
                Try a generation without an account. Five more credits are
                waiting when you sign up.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" variant="accent">
                  <Link href="/studio">
                    Start Designing
                    <ArrowRight />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-white/5 text-white backdrop-blur-sm hover:border-white/45 hover:bg-white/12"
                >
                  <Link href="/inspirations">Explore Inspirations</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
