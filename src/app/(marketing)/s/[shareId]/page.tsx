import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

import { DesignResult } from '@/components/design/design-result'
import { Button } from '@/components/ui/button'
import { siteConfig } from '@/config/site'
import { getSharedDesign } from '@/server/services/designs'

type Props = { params: Promise<{ shareId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params
  const design = await getSharedDesign(shareId)

  if (!design) return { title: 'Design not found' }

  const title = `${design.title} — ${design.labels.style} ${design.labels.room}`
  return {
    title,
    description:
      design.description ??
      `A ${design.labels.style.toLowerCase()} ${design.labels.room.toLowerCase()} generated with ${siteConfig.name}.`,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: design.description ?? undefined,
      images: design.resultUrl ? [design.resultUrl] : undefined,
    },
  }
}

/**
 * Public read-only view of a shared design. Unlisted rather than private: the
 * share id is a 96-bit random token and the page is excluded from indexing.
 */
export default async function SharedDesignPage({ params }: Props) {
  const { shareId } = await params
  const design = await getSharedDesign(shareId)

  if (!design) notFound()

  return (
    <div className="container-studio py-14 pt-28 sm:pt-32 lg:py-20 lg:pt-36">
      <DesignResult design={design} eyebrow="Shared design" />

      <div className="mt-16 rounded-lg border border-line bg-surface-warm p-8 text-center sm:p-12">
        <p className="eyebrow">Made with {siteConfig.name}</p>
        <h2 className="mx-auto mt-4 max-w-lg text-2xl leading-tight sm:text-3xl">
          Run the same brief on your own room
        </h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-muted">
          Upload one photograph and try this exact combination of style,
          palette, lighting and mood — no account needed for the first one.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link
            href={`/studio?room=${design.roomType}&style=${design.style}&palette=${design.palette}&lighting=${design.lighting}&mood=${design.mood}`}
          >
            Try this brief
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  )
}
