import { z } from 'zod'

/**
 * Validated, typed environment access.
 *
 * Parsing happens once, lazily, on the server only. Anything the browser needs
 * must go through `NEXT_PUBLIC_*` and is re-exported explicitly below — no
 * secret can leak into a client bundle by accident.
 */

const serverSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be at least 32 characters'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  AI_PROVIDER: z.enum(['mock', 'replicate', 'openai']).default('mock'),
  REPLICATE_API_TOKEN: z.string().optional(),
  REPLICATE_MODEL_VERSION: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_IMAGE_MODEL: z.string().default('gpt-image-1'),
  OPENAI_VISION_MODEL: z.string().default('gpt-4.1-mini'),

  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),

  BILLING_PROVIDER: z.enum(['none', 'stripe']).default('none'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | null = null

export function env(): ServerEnv {
  if (cached) return cached

  const parsed = serverSchema.safeParse(process.env)

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  · ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(
      `Invalid environment configuration:\n${issues}\n\nCopy .env.example to .env and fill in the required values.`,
    )
  }

  cached = parsed.data
  return cached
}

/** Public app URL — safe on both sides of the network boundary. */
export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

/** Google sign-in is only offered when both halves of the credential exist. */
export function isGoogleEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  )
}
