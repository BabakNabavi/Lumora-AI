import type { Metadata } from 'next'
import Image from 'next/image'

import { Pagination } from '@/components/dashboard/design-grid'
import { PageHeader } from '@/components/dashboard/shell'
import { Badge, EmptyState } from '@/components/ui/bits'
import { formatDate } from '@/lib/utils'
import { listAllDesigns } from '@/server/services/admin'

export const metadata: Metadata = {
  title: 'Designs',
  robots: { index: false, follow: false },
}

const STATUS_VARIANT = {
  COMPLETED: 'success',
  PROCESSING: 'warning',
  PENDING: 'neutral',
  FAILED: 'danger',
} as const

export default async function AdminDesignsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: rawPage } = await searchParams
  const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1)

  const result = await listAllDesigns(page, 24)

  return (
    <>
      <PageHeader
        title="Designs"
        description={`${result.total} design${result.total === 1 ? '' : 's'} generated across all accounts.`}
      />

      {result.items.length === 0 ? (
        <EmptyState title="No designs yet" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((design) => (
              <article
                key={design.id}
                className="overflow-hidden rounded-lg border border-line bg-surface shadow-soft"
              >
                <div className="relative aspect-4/3 bg-canvas-deep">
                  <Image
                    src={design.thumbnailUrl}
                    alt={design.title}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <span className="absolute left-3 top-3">
                    <Badge variant={STATUS_VARIANT[design.status]}>
                      {design.status.toLowerCase()}
                    </Badge>
                  </span>
                </div>

                <div className="p-4">
                  <h2 className="truncate font-display text-[0.9375rem] text-ink">
                    {design.title}
                  </h2>
                  <p className="mt-1 truncate text-xs text-ink-muted">
                    {design.style} · {design.room}
                  </p>
                  <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
                    <p className="truncate text-xs text-ink-faint">
                      {design.owner}
                    </p>
                    <p className="shrink-0 text-xs text-ink-faint">
                      {formatDate(design.createdAt)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            basePath="/admin/designs"
          />
        </>
      )}
    </>
  )
}
