import type { Metadata } from 'next'
import Link from 'next/link'
import { Images, Sparkles } from 'lucide-react'

import { DesignGrid, Pagination } from '@/components/dashboard/design-grid'
import { PageHeader } from '@/components/dashboard/shell'
import { EmptyState } from '@/components/ui/bits'
import { Button } from '@/components/ui/button'
import { ROOMS, STYLES, isRoomId, isStyleId } from '@/config/design-options'
import { requireUser } from '@/lib/auth/current-user'
import { listDesigns } from '@/server/services/designs'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'My designs',
  robots: { index: false, follow: false },
}

type Search = {
  page?: string
  style?: string
  room?: string
}

export default async function DesignsPage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const user = await requireUser()
  const params = await searchParams

  const style = params.style && isStyleId(params.style) ? params.style : undefined
  const roomType = params.room && isRoomId(params.room) ? params.room : undefined
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)

  const result = await listDesigns({
    userId: user.id,
    page,
    pageSize: 12,
    style,
    roomType,
  })

  const hasFilters = Boolean(style || roomType)

  return (
    <>
      <PageHeader
        title="My designs"
        description={
          result.total === 0
            ? 'Generated designs collect here.'
            : `${result.total} design${result.total === 1 ? '' : 's'} in your workspace.`
        }
        actions={
          <Button asChild variant="accent">
            <Link href="/studio">
              <Sparkles />
              New design
            </Link>
          </Button>
        }
      />

      <div className="mb-8 space-y-3">
        <FilterRow label="Style">
          <Chip href="/dashboard/designs" active={!style}>
            All
          </Chip>
          {STYLES.map((s) => (
            <Chip
              key={s.id}
              href={buildHref({ style: s.id, room: roomType })}
              active={style === s.id}
            >
              {s.name}
            </Chip>
          ))}
        </FilterRow>

        <FilterRow label="Room">
          <Chip href={buildHref({ style })} active={!roomType}>
            All
          </Chip>
          {ROOMS.map((r) => (
            <Chip
              key={r.id}
              href={buildHref({ style, room: r.id })}
              active={roomType === r.id}
            >
              {r.name}
            </Chip>
          ))}
        </FilterRow>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={<Images />}
          title={hasFilters ? 'Nothing matches those filters' : 'No designs yet'}
          description={
            hasFilters
              ? 'Try clearing a filter, or generate this combination yourself.'
              : 'Upload a photograph of a room and generate your first redesign.'
          }
          action={
            <Button asChild>
              <Link href={hasFilters ? '/dashboard/designs' : '/studio'}>
                {hasFilters ? 'Clear filters' : 'Start designing'}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <DesignGrid designs={result.items} />
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            basePath="/dashboard/designs"
            query={{ style, room: roomType }}
          />
        </>
      )}
    </>
  )
}

function buildHref(filters: { style?: string; room?: string }) {
  const params = new URLSearchParams()
  if (filters.style) params.set('style', filters.style)
  if (filters.room) params.set('room', filters.room)
  const qs = params.toString()
  return qs ? `/dashboard/designs?${qs}` : '/dashboard/designs'
}

function FilterRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-12 shrink-0 text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </span>
      <div className="flex flex-1 gap-1.5 overflow-x-auto pb-1">{children}</div>
    </div>
  )
}

function Chip({
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
        'shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors',
        active
          ? 'border-ink bg-ink text-canvas'
          : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
      )}
    >
      {children}
    </Link>
  )
}
