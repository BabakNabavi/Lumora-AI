import type { Metadata } from 'next'

import {
  DeleteAccountDialog,
  PasswordForm,
  ProfileForm,
} from '@/components/dashboard/account-forms'
import { PageHeader } from '@/components/dashboard/shell'
import { Badge } from '@/components/ui/bits'
import { requireUser } from '@/lib/auth/current-user'
import { formatDate } from '@/lib/utils'
import { providerStatus } from '@/lib/ai'

export const metadata: Metadata = {
  title: 'Settings',
  robots: { index: false, follow: false },
}

function Panel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-6 sm:p-7">
      <h2 className="font-display text-lg text-ink">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  )
}

export default async function SettingsPage() {
  const user = await requireUser()
  const ai = providerStatus()

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account, your password, and what this deployment is running."
      />

      <div className="grid max-w-3xl gap-5">
        <Panel title="Profile">
          <ProfileForm name={user.name} email={user.email} />
        </Panel>

        <Panel
          title="Password"
          description={
            user.hasPassword
              ? 'Choose something you are not using elsewhere.'
              : 'Add a password so you can sign in without Google.'
          }
        >
          <PasswordForm hasPassword={user.hasPassword} />
        </Panel>

        <Panel title="Account">
          <dl className="divide-y divide-line overflow-hidden rounded-md border border-line">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-[0.8125rem] text-ink-muted">Plan</dt>
              <dd>
                <Badge variant={user.plan === 'PRO' ? 'ink' : 'neutral'}>
                  {user.plan === 'PRO' ? 'Pro' : 'Free'}
                </Badge>
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-[0.8125rem] text-ink-muted">Role</dt>
              <dd className="text-[0.8125rem] text-ink">
                {user.role === 'ADMIN' ? 'Administrator' : 'Member'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-[0.8125rem] text-ink-muted">Member since</dt>
              <dd className="text-[0.8125rem] text-ink">
                {formatDate(user.createdAt, 'long')}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel
          title="AI provider"
          description="The image provider is chosen by environment variable and abstracted behind one interface — nothing in the interface changes when it is swapped."
        >
          <dl className="divide-y divide-line overflow-hidden rounded-md border border-line">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-[0.8125rem] text-ink-muted">Configured</dt>
              <dd className="font-mono text-[0.8125rem] text-ink">
                {ai.configured}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-[0.8125rem] text-ink-muted">Active</dt>
              <dd className="flex items-center gap-2.5">
                <span className="font-mono text-[0.8125rem] text-ink">
                  {ai.active}
                </span>
                {ai.usingFallback && (
                  <Badge variant="warning">missing credentials</Badge>
                )}
              </dd>
            </div>
          </dl>
          {ai.active === 'mock' && (
            <p className="mt-4 text-xs leading-relaxed text-ink-faint">
              The offline renderer runs a real colour-grading pipeline driven by
              the style, palette, lighting and mood coefficients — set
              <code className="mx-1 rounded bg-canvas-deep px-1.5 py-0.5 font-mono">
                AI_PROVIDER
              </code>
              and the matching API key to route generations to a hosted model.
            </p>
          )}
        </Panel>

        <Panel
          title="Danger zone"
          description="Deleting your account removes every design and image permanently."
        >
          <DeleteAccountDialog email={user.email} />
        </Panel>
      </div>
    </>
  )
}
