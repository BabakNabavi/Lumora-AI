import 'server-only'

import { cookies } from 'next/headers'

import { demoConfig } from '@/config/site'

/**
 * Guest demo allowance.
 *
 * A visitor can run one real generation before creating an account. The counter
 * lives in a signed-free, HTTP-only cookie: it is trivially resettable by
 * clearing cookies, which is an acceptable trade for not requiring an identity
 * before the product has proved itself. Anything that costs real money is
 * behind the credit ledger instead.
 */

const MAX = demoConfig.generations

export async function readDemoUsage(): Promise<number> {
  const store = await cookies()
  const raw = store.get(demoConfig.cookieName)?.value
  const parsed = Number.parseInt(raw ?? '0', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export async function demoRemaining(): Promise<number> {
  return Math.max(0, MAX - (await readDemoUsage()))
}

export async function consumeDemoGeneration(): Promise<void> {
  const used = await readDemoUsage()
  const store = await cookies()

  store.set(demoConfig.cookieName, String(used + 1), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}
