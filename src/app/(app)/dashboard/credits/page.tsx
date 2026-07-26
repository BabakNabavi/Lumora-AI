import type { Metadata } from 'next'
import { Check, Sparkles } from 'lucide-react'

import { PlanSwitchForm } from '@/components/dashboard/account-forms'
import { PageHeader } from '@/components/dashboard/shell'
import { Badge, EmptyState, Stat } from '@/components/ui/bits'
import { PLANS } from '@/config/design-options'
import { requireUser } from '@/lib/auth/current-user'
import { cn, formatDateTime } from '@/lib/utils'
import { creditHistory, creditSummary } from '@/server/services/credits'

export const metadata: Metadata = {
  title: 'AI credits',
  robots: { index: false, follow: false },
}

const REASON_LABEL: Record<string, string> = {
  SIGNUP_BONUS: 'Welcome credits',
  GENERATION: 'Generation',
  GENERATION_REFUND: 'Refund — failed generation',
  PLAN_CHANGE: 'Plan change',
  ADMIN_ADJUSTMENT: 'Adjustment',
}

export default async function CreditsPage() {
  const user = await requireUser()
  const [summary, history] = await Promise.all([
    creditSummary(user.id),
    creditHistory(user.id, 40),
  ])

  return (
    <>
      <PageHeader
        title="AI credits"
        description="One credit per generation. Failed generations are refunded automatically — the ledger below shows every movement."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Balance"
          value={summary.balance}
          hint={`${summary.plan === 'PRO' ? 'Pro' : 'Free'} plan`}
          icon={<Sparkles />}
        />
        <Stat label="Spent" value={summary.totalSpent} hint="All time" />
        <Stat label="Granted" value={summary.totalGranted} hint="All time" />
      </div>

      <section className="mt-14">
        <h2 className="font-display text-xl text-ink">Plans</h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Payments are not connected in this build — switching applies
          immediately so the flow can be explored end to end.
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {PLANS.map((plan) => {
            const current = (user.plan === 'PRO') === (plan.id === 'pro')
            return (
              <div
                key={plan.id}
                className={cn(
                  'flex flex-col rounded-lg border p-6',
                  current
                    ? 'border-ink/20 bg-surface shadow-lift'
                    : 'border-line bg-surface shadow-soft',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{plan.name}</p>
                    <p className="mt-3 font-display text-3xl leading-none text-ink">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                      {plan.price > 0 && (
                        <span className="ml-1.5 text-sm text-ink-faint">
                          /month
                        </span>
                      )}
                    </p>
                  </div>
                  {current && <Badge variant="ink">Current</Badge>}
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5 text-[0.8125rem]">
                      <Check
                        className="mt-0.5 size-3.5 shrink-0 text-success"
                        aria-hidden
                      />
                      <span className="text-ink-body">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  <PlanSwitchForm
                    plan={user.plan}
                    targetPlan={plan.id}
                    label={
                      plan.id === 'pro'
                        ? 'Switch to Pro'
                        : 'Switch to Free'
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-xl text-ink">Ledger</h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Every change to your balance, newest first.
        </p>

        <div className="mt-6">
          {history.length === 0 ? (
            <EmptyState
              title="No movements yet"
              description="Credit changes appear here as soon as you generate something."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full min-w-[34rem] text-left text-sm">
                <thead className="border-b border-line bg-canvas-deep/40">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                      Date
                    </th>
                    <th scope="col" className="px-5 py-3 text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                      Reason
                    </th>
                    <th scope="col" className="px-5 py-3 text-right text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                      Change
                    </th>
                    <th scope="col" className="px-5 py-3 text-right text-[0.6875rem] uppercase tracking-[0.12em] text-ink-faint">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap px-5 py-3.5 text-[0.8125rem] text-ink-muted">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-[0.8125rem] text-ink">
                        {REASON_LABEL[row.reason] ?? row.reason}
                        {row.note && (
                          <span className="block text-xs text-ink-faint">
                            {row.note}
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap px-5 py-3.5 text-right text-[0.8125rem] tabular-nums',
                          row.amount > 0 ? 'text-success' : 'text-ink-body',
                        )}
                      >
                        {row.amount > 0 ? '+' : ''}
                        {row.amount}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right text-[0.8125rem] tabular-nums text-ink-muted">
                        {row.balanceAfter}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
