import { RateLimitError } from './errors'

/**
 * Fixed-window rate limiter held in process memory.
 *
 * Deliberately simple and deliberately documented: it protects a single
 * instance against bursts and scripted abuse of the expensive endpoints. A
 * multi-instance deployment should point `consume` at Redis or Upstash — the
 * call sites do not change, only this file does.
 */

interface Window {
  count: number
  resetAt: number
}

const windows = new Map<string, Window>()
let lastSweep = Date.now()

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key)
  }
}

export interface LimitOptions {
  /** Requests allowed inside the window. */
  limit: number
  /** Window length in milliseconds. */
  windowMs: number
  message?: string
}

export function consume(key: string, options: LimitOptions): void {
  const now = Date.now()
  sweep(now)

  const existing = windows.get(key)

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + options.windowMs })
    return
  }

  if (existing.count >= options.limit) {
    const seconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
    throw new RateLimitError(
      options.message ?? `Too many requests. Try again in ${seconds}s.`,
    )
  }

  existing.count += 1
}

export const limits = {
  auth: { limit: 10, windowMs: 5 * 60_000, message: 'Too many attempts. Wait a few minutes and try again.' },
  generate: { limit: 12, windowMs: 60_000, message: 'You are generating very quickly — give it a moment.' },
  upload: { limit: 30, windowMs: 60_000 },
} satisfies Record<string, LimitOptions>
