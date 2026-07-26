import type { Metadata } from 'next'

import { PageHeader } from '@/components/dashboard/shell'
import { Pagination } from '@/components/dashboard/design-grid'
import { Avatar } from '@/components/ui/primitives'
import { Badge, EmptyState } from '@/components/ui/bits'
import { formatDate, formatRelative, initials } from '@/lib/utils'
import { listUsers } from '@/server/services/admin'

export const metadata: Metadata = {
  title: 'Users',
  robots: { index: false, follow: false },
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

  const result = await listUsers(page, 20, params.q)

  return (
    <>
      <PageHeader
        title="Users"
        description={`${result.total} account${result.total === 1 ? '' : 's'} registered.`}
      />

      {result.items.length === 0 ? (
        <EmptyState title="No accounts yet" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[46rem] text-left text-sm">
              <thead className="border-b border-line bg-canvas-deep/40">
                <tr>
                  {['Account', 'Plan', 'Credits', 'Designs', 'Last seen', 'Joined'].map(
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
                {result.items.map((user) => (
                  <tr key={user.id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          fallback={initials(user.name, user.email)}
                          className="size-8"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[0.8125rem] text-ink">
                            {user.name ?? '—'}
                            {user.role === 'ADMIN' && (
                              <Badge variant="ink" className="ml-2">
                                admin
                              </Badge>
                            )}
                          </p>
                          <p className="truncate text-xs text-ink-faint">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={user.plan === 'PRO' ? 'accent' : 'neutral'}>
                        {user.plan.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-[0.8125rem] tabular-nums text-ink-body">
                      {user.credits}
                    </td>
                    <td className="px-5 py-4 text-[0.8125rem] tabular-nums text-ink-body">
                      {user._count.designs}
                      <span className="ml-1.5 text-xs text-ink-faint">
                        / {user._count.generations} runs
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[0.8125rem] text-ink-muted">
                      {user.lastLoginAt ? formatRelative(user.lastLoginAt) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[0.8125rem] text-ink-muted">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            basePath="/admin/users"
            query={{ q: params.q }}
          />
        </>
      )}
    </>
  )
}
