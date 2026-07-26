'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'

import { Parallax, SplitHeading } from '@/components/shared/motion'
import { Button } from '@/components/ui/button'
import type { Plate } from '@/lib/assets'
import { siteConfig } from '@/config/site'

const EASE = [0.22, 1, 0.36, 1] as const

export function Hero({ plate }: { plate: Plate }) {
  const reduce = useReducedMotion()

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.85, delay, ease: EASE },
        }

  return (
    <section className="relative overflow-hidden pt-header">
      {/* Warm wash behind the type — keeps the ivory canvas from reading flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[62vh] bg-[radial-gradient(120%_90%_at_18%_0%,#fdf6ec_0%,transparent_62%)]"
      />

      <div className="container-studio relative pb-16 pt-16 sm:pt-20 lg:pb-24 lg:pt-28">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-16">
          <div className="max-w-xl">
            <motion.div {...fade(0.05)}>
              <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface/70 px-3.5 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-ink-muted backdrop-blur-sm">
                <Sparkles className="size-3 text-accent" aria-hidden />
                AI interior design
              </span>
            </motion.div>

            <h1 className="mt-7 text-[2.6rem] leading-[1.04] tracking-[-0.028em] sm:text-6xl lg:text-[4.25rem]">
              <SplitHeading text="Reimagine Your" delay={0.12} />
              <span className="block">
                <SplitHeading text="Space With" delay={0.24} />{' '}
                <span className="italic text-accent">
                  <SplitHeading text="AI" delay={0.34} />
                </span>
              </span>
            </h1>

            <motion.p
              {...fade(0.5)}
              className="mt-7 max-w-md text-pretty text-base leading-relaxed text-ink-muted sm:text-[1.0625rem]"
            >
              {siteConfig.subtitle} Upload one photograph, choose a style, a
              palette and a mood — and see your room again.
            </motion.p>

            <motion.div
              {...fade(0.62)}
              className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button asChild size="lg">
                <Link href="/studio">
                  Start Designing
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/inspirations">Explore Inspirations</Link>
              </Button>
            </motion.div>

            <motion.dl
              {...fade(0.74)}
              className="mt-14 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-8"
            >
              {[
                { value: '8', label: 'Design styles' },
                { value: '7', label: 'Room types' },
                { value: '~40s', label: 'Per render' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="sr-only">{stat.label}</dt>
                  <dd className="font-display text-2xl leading-none text-ink">
                    {stat.value}
                  </dd>
                  <dd className="mt-2 text-[0.6875rem] uppercase tracking-[0.13em] text-ink-faint">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 1.03 }}
            animate={reduce ? undefined : { opacity: 1, scale: 1 }}
            transition={{ duration: 1.25, delay: 0.18, ease: EASE }}
            className="relative"
          >
            <Parallax distance={26}>
              <figure className="relative overflow-hidden rounded-xl bg-canvas-deep shadow-float">
                <Image
                  src={plate.src}
                  alt="A softly lit living room reimagined in a Japandi style"
                  width={plate.width}
                  height={plate.height}
                  placeholder={plate.blurDataURL ? 'blur' : 'empty'}
                  blurDataURL={plate.blurDataURL}
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="h-full w-full object-cover"
                />
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-charcoal/65 to-transparent p-6 pt-16">
                  <div className="text-white">
                    <p className="text-[0.625rem] font-medium uppercase tracking-[0.2em] text-white/65">
                      Generated result
                    </p>
                    <p className="mt-1.5 font-display text-lg">
                      Japandi · Earthy · Warm light
                    </p>
                  </div>
                </figcaption>
              </figure>
            </Parallax>

            {/* Floating provenance chip */}
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.95, ease: EASE }}
              // Anchored right: the figure's own caption sits bottom-left, and
              // the two collided at desktop widths.
              className="absolute -bottom-6 right-4 hidden rounded-lg border border-line bg-surface/95 p-4 shadow-lift backdrop-blur-sm sm:block lg:-right-6"
            >
              <p className="eyebrow">Architecture preserved</p>
              <p className="mt-2 max-w-[15rem] text-xs leading-relaxed text-ink-muted">
                Walls, windows and the camera angle stay exactly where they are.
                Only the finishes change.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
