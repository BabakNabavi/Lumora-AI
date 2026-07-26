import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { Reveal, RevealGroup, RevealItem } from '@/components/shared/motion'
import { Badge, EmptyState, SectionHeading } from '@/components/ui/bits'
import { Button } from '@/components/ui/button'
import { STYLES, getPalette, labelFor } from '@/config/design-options'
import { inspirations } from '@/lib/assets'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Inspirations',
  description:
    'A gallery of AI interior designs across eight styles and seven room types — each one a real generation you can reproduce in the studio.',
  alternates: { canonical: '/inspirations' },
}

export default async function InspirationsPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string }>
}) {
  const { style: activeStyle } = await searchParams
  const all = inspirations()

  const items = activeStyle
    ? all.filter((item) => item.style === activeStyle)
    : all

  return (
    <div className="pt-header">
      <section className="container-studio pb-14 pt-16 sm:pt-20 lg:pb-16 lg:pt-24">
        <Reveal>
          <SectionHeading
            eyebrow="Inspirations"
            title="Twelve rooms, twelve directions"
            description="Every image here was produced by the studio's own pipeline from the same catalog you get. Open one to see the brief that made it, then run it against your own photograph."
          />
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mt-10 flex flex-wrap gap-2">
            <FilterPill href="/inspirations" active={!activeStyle}>
              All styles
            </FilterPill>
            {STYLES.map((style) => (
              <FilterPill
                key={style.id}
                href={`/inspirations?style=${style.id}`}
                active={activeStyle === style.id}
              >
                {style.name}
              </FilterPill>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="container-studio pb-24 lg:pb-32">
        {items.length === 0 ? (
          <EmptyState
            title="Nothing in that style yet"
            description="Try another style, or generate the first one yourself in the studio."
            action={
              <Button asChild>
                <Link href={`/studio?style=${activeStyle}`}>
                  Generate this style
                </Link>
              </Button>
            }
          />
        ) : (
          <RevealGroup
            stagger={0.05}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {items.map((item) => {
              const palette = getPalette(item.palette)
              const query = new URLSearchParams({
                room: item.room,
                style: item.style,
                palette: item.palette,
                lighting: item.lighting,
                mood: item.mood,
              })

              return (
                <RevealItem key={item.slug}>
                  <article className="group h-full overflow-hidden rounded-lg border border-line bg-surface shadow-soft transition-shadow duration-500 hover:shadow-float">
                    <div className="relative aspect-4/3 overflow-hidden bg-canvas-deep">
                      <Image
                        src={item.plate.src}
                        alt={`${item.title} — a ${labelFor('style', item.style)} ${labelFor('room', item.room).toLowerCase()}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        placeholder={
                          item.plate.blurDataURL ? 'blur' : 'empty'
                        }
                        blurDataURL={item.plate.blurDataURL}
                        className="object-cover transition-transform duration-[900ms] ease-[var(--ease-out-quint)] group-hover:scale-[1.04]"
                      />
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="font-display text-[1.0625rem] text-ink">
                            {item.title}
                          </h2>
                          <p className="mt-1 text-[0.8125rem] text-ink-muted">
                            {labelFor('style', item.style)} ·{' '}
                            {labelFor('room', item.room)}
                          </p>
                        </div>
                        {palette && (
                          <span
                            className="flex shrink-0 overflow-hidden rounded ring-1 ring-black/5"
                            aria-hidden
                          >
                            {palette.swatches.map((hex) => (
                              <span
                                key={hex}
                                className="block size-4"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-1.5">
                        <Badge variant="outline">
                          {labelFor('lighting', item.lighting)} light
                        </Badge>
                        <Badge variant="outline">
                          {labelFor('mood', item.mood)}
                        </Badge>
                      </div>

                      <Link
                        href={`/studio?${query.toString()}`}
                        className="mt-5 inline-flex items-center gap-1.5 text-[0.8125rem] text-ink transition-colors hover:text-accent"
                      >
                        Use this brief
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      </Link>
                    </div>
                  </article>
                </RevealItem>
              )
            })}
          </RevealGroup>
        )}
      </section>
    </div>
  )
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-4 py-2 text-[0.8125rem] transition-colors',
        active
          ? 'border-ink bg-ink text-canvas'
          : 'border-line-strong bg-surface text-ink-body hover:border-ink/25 hover:text-ink',
      )}
    >
      {children}
    </Link>
  )
}
