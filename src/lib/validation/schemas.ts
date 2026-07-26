import { z } from 'zod'

import {
  LIGHTING_IDS,
  MOOD_IDS,
  PALETTE_IDS,
  ROOM_IDS,
  STYLE_IDS,
} from '@/config/design-options'

/* ── design brief ─────────────────────────────────────────────────────────── */

export const briefSchema = z.object({
  roomType: z.enum(ROOM_IDS),
  style: z.enum(STYLE_IDS),
  palette: z.enum(PALETTE_IDS),
  lighting: z.enum(LIGHTING_IDS),
  mood: z.enum(MOOD_IDS),
})

export const generateSchema = briefSchema.extend({
  uploadId: z.string().min(1, 'Upload your room photo first.'),
  title: z.string().trim().max(120).optional(),
  seed: z.number().int().nonnegative().optional(),
})

export const regenerateSchema = briefSchema.partial().extend({
  designId: z.string().min(1),
  seed: z.number().int().nonnegative().optional(),
})

/* ── auth ─────────────────────────────────────────────────────────────────── */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Enter your email address.')
  .max(254)
  .email('That does not look like a valid email address.')

const password = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(200, 'That password is too long.')
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), {
    message: 'Include at least one letter and one number.',
  })

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Tell us your name.').max(80),
  email,
  password,
})

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
})

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password,
})

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Tell us your name.').max(80),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: password,
})

/* ── design mutations ─────────────────────────────────────────────────────── */

export const renameDesignSchema = z.object({
  title: z.string().trim().min(1, 'Give it a name.').max(120),
})

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
  favorites: z.coerce.boolean().optional(),
  style: z.enum(STYLE_IDS).optional(),
  roomType: z.enum(ROOM_IDS).optional(),
  search: z.string().trim().max(120).optional(),
})

export type BriefInput = z.infer<typeof briefSchema>
export type GenerateInput = z.infer<typeof generateSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>

/** Flattens a ZodError into `{ field: message }` for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form'
    if (!out[key]) out[key] = issue.message
  }
  return out
}
