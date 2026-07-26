import type { Metadata } from 'next'
import { CircleCheck, Images, Sparkles, Timer, Users } from 'lucide-react'

import { ShareList, VolumeChart } from '@/components/admin/charts'
import { PageHeader } from '@/components/dashboard/shell'
import { Badge, Stat } from '@/components/ui/bits'
import { providerStatus } from '@/lib/ai'
import {
  generationTimeseries,
  platformStats,
  roomBreakdown,
  styleBreakdown,
} from '@/server/services/admin'
import { formatNumber } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Reports',
  robots: { index: false, follow: false },
}

export default async function AdminReportsPage() {
  const [stats, series, styles, rooms] = await Promise.all([
    platformStats(),
    generationTimeseries(14),
    styleBreakdown(),
    roomBreakdown(),
  ])

  const ai = providerStatus()

  return (
    <>
      <PageHeader
        title="Reports"
        description="Platform usage across every account. Read-only — nothing on this screen mutates data."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Users"
          value={formatNumber(stats.users)}
          hint={`${stats.newUsers} in the last 30 days`}
          icon={<Users />}
        />
        <Stat
          label="Designs"
          value={formatNumber(stats.designs)}
          hint={`${stats.completed} completed · ${stats.failed} failed`}
          icon={<Images />}
        />
        <Stat
          label="Success rate"
          value={`${stats.successRate}%`}
          hint={`${formatNumber(stats.generations)} generations run`}
          icon={<CircleCheck />}
        />
        <Stat
          label="Credits spent"
          value={formatNumber(stats.creditsSpent)}
          hint={`${stats.proUsers} accounts on Pro`}
          icon={<Sparkles />}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Stat
          label="Average render time"
          value={
            stats.avgDurationMs > 0
              ? `${(stats.avgDurationMs / 1000).toFixed(1)}s`
              : '—'
          }
          hint="Completed generations only"
          icon={<Timer />}
        />
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="eyebrow">AI provider</p>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-xl leading-none text-ink">
              {ai.active}
            </span>
            {ai.usingFallback ? (
              <Badge variant="warning">
                {ai.configured} selected, credentials missing
              </Badge>
            ) : (
              <Badge variant="success">active</Badge>
            )}
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            Set by <code className="font-mono">AI_PROVIDER</code>. Falling back
            keeps generations working rather than failing the request.
          </p>
        </div>
      </div>

      <div className="mt-10">
        <VolumeChart data={series} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ShareList title="Styles" rows={styles} />
        <ShareList title="Room types" rows={rooms} />
      </div>
    </>
  )
}
