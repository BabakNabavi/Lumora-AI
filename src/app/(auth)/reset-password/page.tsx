import type { Metadata } from 'next'
import { Suspense } from 'react'

import { ResetPasswordForm } from '@/components/auth/auth-forms'
import { Skeleton } from '@/components/ui/bits'

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="h-72 w-full" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
