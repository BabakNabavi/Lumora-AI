import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Copy, Download } from 'lucide-react'

import {
  DeleteDesignButton,
  DownloadButton,
  DuplicateButton,
  FavoriteButton,
  RegenerateButton,
  ShareButton,
} from '@/components/design/design-actions'
import { DesignResult } from '@/components/design/design-result'
import { Button } from '@/components/ui/button'
import { ForbiddenError, NotFoundError } from '@/lib/errors'
import { requireUser } from '@/lib/auth/current-user'
import { getDesignForUser } from '@/server/services/designs'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const user = await requireUser()
    const design = await getDesignForUser(id, user.id)
    return { title: design.title, robots: { index: false, follow: false } }
  } catch {
    return { title: 'Design', robots: { index: false, follow: false } }
  }
}

export default async function DesignDetailPage({ params }: Props) {
  const user = await requireUser()
  const { id } = await params

  let design
  try {
    design = await getDesignForUser(id, user.id)
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      notFound()
    }
    throw error
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-8 -ml-3">
        <Link href="/dashboard/designs">
          <ArrowLeft />
          All designs
        </Link>
      </Button>

      <DesignResult
        design={design}
        actions={
          <>
            <FavoriteButton design={design} />
            <DownloadButton design={design} />
            <ShareButton design={design} />
          </>
        }
      />

      <section className="mt-16 border-t border-line pt-8">
        <h2 className="font-display text-lg text-ink">More with this design</h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Re-running the brief costs one credit and creates a new design — the
          original stays exactly as it is.
        </p>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <RegenerateButton design={design} variant="outline" />
          <DuplicateButton design={design} />
          <Button asChild variant="outline">
            <Link
              href={`/studio?room=${design.roomType}&style=${design.style}&palette=${design.palette}&lighting=${design.lighting}&mood=${design.mood}`}
            >
              <Copy />
              Use this brief on a new photo
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <a
              href={`/api/designs/${design.id}/download?variant=original`}
              download
            >
              <Download />
              Original photo
            </a>
          </Button>
          <DeleteDesignButton design={design} />
        </div>
      </section>
    </>
  )
}
