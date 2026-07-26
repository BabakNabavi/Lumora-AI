import type { Metadata } from 'next'
import { Suspense } from 'react'

import { LoginForm } from '@/components/auth/auth-forms'
import { Skeleton } from '@/components/ui/bits'
import { isGoogleEnabled } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to AI Interior Studio to reach your designs and credits.',
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <LoginForm googleEnabled={isGoogleEnabled()} />
    </Suspense>
  )
}
