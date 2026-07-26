import type { Metadata } from 'next'
import Link from 'next/link'
import { Heart } from 'lucide-react'

import { DesignGrid, Pagination } from '@/components/dashboard/design-grid'
import { PageHeader } from '@/components/dashboard/shell'
import { EmptyState } from '@/components/ui/bits'
import { Button } from '@/components/ui/button'
import { requireUser } from '@/lib/auth/current-user'
import { listDesigns } from '@/server/services/designs'

export const metadata: Metadata = {
  title: 'Favorites',
  robots: { index: false, follow: false },
}

export default async function FavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const user = await requireUser()
  const { page: rawPage } = await searchParams
  const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1)

  const result = await listDesigns({
    userId: user.id,
    page,
    pageSize: 12,
    favoritesOnly: true,
  })

  return (
    <>
      <PageHeader
        title="Favorites"
        description="The designs you marked as worth keeping."
      />

      {result.items.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title="Nothing saved yet"
          description="Open any design and press Save to keep it here. It is the quickest way to shortlist directions before committing to one."
          action={
            <Button asChild>
              <Link href="/dashboard/designs">Browse your designs</Link>
            </Button>
          }
        />
      ) : (
        <>
          <DesignGrid designs={result.items} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            basePath="/dashboard/favorites"
          />
        </>
      )}
    </>
  )
}
