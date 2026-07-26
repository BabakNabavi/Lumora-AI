import {
  getLighting,
  getMood,
  getPalette,
  getRoom,
  getStyle,
  labelFor,
} from '@/config/design-options'

import type { DesignBrief } from './types'

/**
 * Turns a studio brief into the instruction text sent to an image model.
 *
 * Kept in one place so every provider issues comparable prompts and so the
 * exact string can be recorded on the Generation row for the admin audit view.
 */
export function buildPrompt(brief: DesignBrief): string {
  const room = getRoom(brief.roomType)
  const style = getStyle(brief.style)
  const palette = getPalette(brief.palette)
  const lighting = getLighting(brief.lighting)
  const mood = getMood(brief.mood)

  const materials = style?.keywords.join(', ') ?? ''

  return [
    `Interior design photograph of a ${labelFor('room', brief.roomType).toLowerCase()}.`,
    `Style: ${style?.name ?? brief.style} — ${style?.description ?? ''}`,
    materials && `Key materials and details: ${materials}.`,
    `Colour palette: ${palette?.name ?? brief.palette} (${palette?.description ?? ''}).`,
    `Lighting: ${lighting?.name ?? brief.lighting} — ${lighting?.description ?? ''}`,
    `Overall mood: ${mood?.name ?? brief.mood} — ${mood?.description ?? ''}`,
    room && `Programme: ${room.description}`,
    'Preserve the original architecture: keep the room geometry, window and door positions, ceiling height and camera viewpoint exactly as they are.',
    'Replace only finishes, furniture, textiles, lighting fixtures and styling.',
    'Photorealistic architectural photography, natural perspective, no people, no text, no watermarks.',
  ]
    .filter(Boolean)
    .join(' ')
}

/** Negative prompt for providers that accept one (SDXL-family models). */
export function buildNegativePrompt(): string {
  return [
    'distorted perspective',
    'warped walls',
    'extra windows',
    'people',
    'text',
    'watermark',
    'logo',
    'lowres',
    'blurry',
    'cartoon',
    'illustration',
    'oversaturated',
  ].join(', ')
}
