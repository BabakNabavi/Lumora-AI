import type { Metadata } from 'next'
import Link from 'next/link'
import { Heart, Images, Palette, Sparkles } from 'lucide-react'

import { DesignGrid } from '@/components/dashboard/design-grid'
import { PageHeader } from '@/components/dashboard/shell'
import { EmptyState, Stat } from '@/components/ui/bits'
import { Button } from '@/components/ui/button'
import { labelFor } from '@/config/design-options'
import { requireUser } from '@/lib/auth/current-user'
import { dashboardOverview } from '@/server/services/designs'

export const metadata: Metadata = {
  title: 'Overview',
  robots: { index: false, follow: false },
}

export default async function DashboardPage() {
  const user = await requireUser()
  const overview = await dashboardOverview(user.id)

  const firstName = user.name?.split(' ')[0] ?? 'there'

  return (
    <>
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description="Everything you have generated, and what is left in the tank."
        actions={
          <Button asChild variant="accent">
            <Link href="/studio">
              <Sparkles />
              New design
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Total designs"
          value={overview.total}
          hint={`${overview.completed} finished`}
          icon={<Images />}
        />
        <Stat
          label="Saved"
          value={overview.favorites}
          hint="Marked as favourites"
          icon={<Heart />}
        />
        <Stat
          label="AI credits"
          value={user.credits}
          hint={`${user.plan === 'PRO' ? 'Pro' : 'Free'} plan`}
          icon={<Sparkles />}
        />
        <Stat
          label="Most used style"
          value={
            overview.topStyle ? labelFor('style', overview.topStyle) : '—'
          }
          hint={overview.topStyle ? 'Across all designs' : 'Nothing yet'}
          icon={<Palette />}
        />
      </div>

      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl text-ink">Recent projects</h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Your six most recent finished designs.
            </p>
          </div>
          {overview.recent.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/designs">View all</Link>
            </Button>
          )}
        </div>

        {overview.recent.length === 0 ? (
          <EmptyState
            icon={<Images />}
            title="No designs yet"
            description="Upload a photograph of a room and generate your first redesign — it takes about a minute."
            action={
              <Button asChild>
                <Link href="/studio">
                  <Sparkles />
                  Start designing
                </Link>
              </Button>
            }
          />
        ) : (
          <DesignGrid designs={overview.recent} />
        )}
      </section>
    </>
  )
}
