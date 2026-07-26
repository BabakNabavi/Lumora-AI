import type { Metadata } from 'next'
import { Suspense } from 'react'

import { Studio } from '@/components/studio/studio'
import { Skeleton } from '@/components/ui/bits'
import { ROOMS, STYLES } from '@/config/design-options'
import { getCurrentUser } from '@/lib/auth/current-user'
import { roomPlate, stylePlate, type Plate } from '@/lib/assets'
import { demoRemaining } from '@/server/services/demo'

export const metadata: Metadata = {
  title: 'Studio',
  description:
    'Upload a photo of your room, choose a style, palette, lighting and mood, and generate an AI interior redesign.',
  alternates: { canonical: '/studio' },
}

export const dynamic = 'force-dynamic'

export default async function StudioPage() {
  const [user, remaining] = await Promise.all([
    getCurrentUser(),
    demoRemaining(),
  ])

  const roomPlates: Record<string, Plate> = Object.fromEntries(
    ROOMS.map((room) => [room.id, roomPlate(room.id)]),
  )
  const stylePlates: Record<string, Plate> = Object.fromEntries(
    STYLES.map((style) => [style.id, stylePlate(style.id)]),
  )

  return (
    <div className="container-studio py-14 pt-28 sm:py-16 sm:pt-32 lg:py-20 lg:pt-36">
      <Suspense fallback={<StudioSkeleton />}>
        <Studio
          isSignedIn={Boolean(user)}
          credits={user?.credits ?? 0}
          demoRemaining={remaining}
          roomPlates={roomPlates}
          stylePlates={stylePlates}
        />
      </Suspense>
    </div>
  )
}

function StudioSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
