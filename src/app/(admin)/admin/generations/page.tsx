import type { Metadata } from 'next'
import Link from 'next/link'

import { Pagination } from '@/components/dashboard/design-grid'
import { PageHeader } from '@/components/dashboard/shell'
import { Badge, EmptyState } from '@/components/ui/bits'
import { formatDateTime, truncate } from '@/lib/utils'
import { listGenerations } from '@/server/services/admin'

export const metadata: Metadata = {
  title: 'AI generations',
  robots: { index: false, follow: false },
}

const STATUS_VARIANT = {
  COMPLETED: 'success',
  PROCESSING: 'warning',
  PENDING: 'neutral',
  FAILED: 'danger',
} as const

export default async function AdminGenerationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: rawPage } = await searchParams
  const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1)

  const result = await listGenerations(page, 30)

  return (
    <>
      <PageHeader
        title="AI generations"
        description="Every provider call, successful or not, with the exact prompt that was sent."
      />

      {result.items.length === 0 ? (
        <EmptyState title="No generations recorded yet" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-line bg-canvas-deep/40">
                <tr>
                  {['When', 'Account', 'Provider', 'Status', 'Duration', 'Design'].map(
                    (heading) => (
                      <th
                        key={heading}
                        scope="col"
                        className="px-5 py-3 text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {result.items.map((generation) => (
                  <tr key={generation.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-4 text-[0.8125rem] text-ink-muted">
                      {formatDateTime(generation.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-[0.8125rem] text-ink-body">
                      {generation.user?.email ?? (
                        <span className="text-ink-faint">Guest demo</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-ink">
                        {generation.provider}
                      </span>
                      {generation.model && (
                        <span className="mt-0.5 block font-mono text-[0.6875rem] text-ink-faint">
                          {generation.model}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={STATUS_VARIANT[generation.status]}>
                        {generation.status.toLowerCase()}
                      </Badge>
                      {generation.error && (
                        <p className="mt-1.5 max-w-56 text-xs leading-snug text-danger">
                          {truncate(generation.error, 90)}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[0.8125rem] tabular-nums text-ink-muted">
                      {generation.durationMs
                        ? `${(generation.durationMs / 1000).toFixed(1)}s`
                        : '—'}
                    </td>
                    <td className="px-5 py-4 text-[0.8125rem]">
                      {generation.design ? (
                        <Link
                          href={`/designs/${generation.design.id}`}
                          className="text-ink underline underline-offset-4 hover:text-accent"
                        >
                          {truncate(generation.design.title, 28)}
                        </Link>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            basePath="/admin/generations"
          />
        </>
      )}
    </>
  )
}
