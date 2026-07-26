import 'server-only'

import type { CreditReason } from '@prisma/client'

import { db } from '@/lib/db'
import { InsufficientCreditsError, NotFoundError } from '@/lib/errors'

/**
 * Credit ledger.
 *
 * `User.credits` is a materialised balance kept correct by only ever changing
 * it inside these helpers, each of which writes a matching `CreditTransaction`
 * row in the same database transaction. The balance can therefore always be
 * reconciled against the ledger, which is what the admin panel reports on.
 */

export async function spendCredits(
  userId: string,
  amount: number,
  reason: CreditReason = 'GENERATION',
  note?: string,
): Promise<number> {
  if (amount <= 0) throw new Error('spendCredits expects a positive amount')

  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })
    if (!user) throw new NotFoundError('Account not found.')
    if (user.credits < amount) throw new InsufficientCreditsError(user.credits)

    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    })

    await tx.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        balanceAfter: updated.credits,
        reason,
        note,
      },
    })

    return updated.credits
  })
}

export async function grantCredits(
  userId: string,
  amount: number,
  reason: CreditReason,
  note?: string,
): Promise<number> {
  if (amount <= 0) throw new Error('grantCredits expects a positive amount')

  return db.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    })

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        balanceAfter: updated.credits,
        reason,
        note,
      },
    })

    return updated.credits
  })
}

/** Returns credits after a failed generation so a provider outage costs nothing. */
export async function refundCredits(
  userId: string,
  amount: number,
  note: string,
): Promise<number> {
  return grantCredits(userId, amount, 'GENERATION_REFUND', note)
}

export async function creditHistory(userId: string, take = 30) {
  return db.creditTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
  })
}

export async function creditSummary(userId: string) {
  const [user, spentAgg, grantedAgg] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { credits: true, plan: true },
    }),
    db.creditTransaction.aggregate({
      where: { userId, amount: { lt: 0 } },
      _sum: { amount: true },
    }),
    db.creditTransaction.aggregate({
      where: { userId, amount: { gt: 0 } },
      _sum: { amount: true },
    }),
  ])

  return {
    balance: user?.credits ?? 0,
    plan: user?.plan ?? 'FREE',
    totalSpent: Math.abs(spentAgg._sum.amount ?? 0),
    totalGranted: grantedAgg._sum.amount ?? 0,
  }
}
