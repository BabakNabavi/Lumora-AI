import 'server-only'

import { env } from '@/lib/env'

import { MockAIProvider } from './providers/mock'
import { OpenAIProvider } from './providers/openai'
import { ReplicateProvider } from './providers/replicate'
import type { AIProvider } from './types'

export * from './types'
export { buildPrompt } from './prompt'
export { buildDescription, buildInsights } from './insights'

const registry = {
  mock: () => new MockAIProvider(),
  replicate: () => new ReplicateProvider(),
  openai: () => new OpenAIProvider(),
} as const

export type ProviderName = keyof typeof registry

let cached: AIProvider | null = null

/**
 * Resolves the configured image provider.
 *
 * If a key-dependent provider is selected but its credentials are missing, the
 * mock renderer takes over instead of the request failing — a missing key
 * should degrade the output, never take the product down. The substitution is
 * logged once and is visible in the admin panel, so it is never silent.
 */
export function aiProvider(): AIProvider {
  if (cached) return cached

  const name = env().AI_PROVIDER as ProviderName
  const provider = (registry[name] ?? registry.mock)()

  if (provider.requiresApiKey && !provider.isConfigured()) {
    console.warn(
      `[ai] provider "${provider.name}" is selected but not configured — falling back to the offline mock renderer.`,
    )
    cached = new MockAIProvider()
    return cached
  }

  cached = provider
  return cached
}

/** Provider status for the admin panel and the studio's provider badge. */
export function providerStatus(): {
  configured: ProviderName
  active: string
  usingFallback: boolean
  requiresApiKey: boolean
} {
  const configured = env().AI_PROVIDER as ProviderName
  const active = aiProvider()
  return {
    configured,
    active: active.name,
    usingFallback: active.name !== configured,
    requiresApiKey: active.requiresApiKey,
  }
}
