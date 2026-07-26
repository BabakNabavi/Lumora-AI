import type { Metadata } from 'next'
import { Suspense } from 'react'

import { SignupForm } from '@/components/auth/auth-forms'
import { Skeleton } from '@/components/ui/bits'
import { isGoogleEnabled } from '@/lib/env'

export const metadata: Metadata = {
  title: 'Create account',
  description:
    'Create a free AI Interior Studio account — five AI generations included, no card required.',
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <SignupForm googleEnabled={isGoogleEnabled()} />
    </Suspense>
  )
}
