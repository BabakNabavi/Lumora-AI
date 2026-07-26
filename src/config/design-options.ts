import catalog from './catalog.json'

/* ═══════════════════════════════════════════════════════════════════════════
   The design catalog is the single source of truth for the whole product:
   the studio UI reads it, the asset generator renders from it, the mock AI
   provider composes its image transform from it, and the insights engine
   writes copy from it. Adding a style means editing `catalog.json` only.
   ═══════════════════════════════════════════════════════════════════════════ */

export const ROOM_IDS = [
  'living-room',
  'bedroom',
  'kitchen',
  'dining-room',
  'office',
  'bathroom',
  'outdoor',
] as const

export const STYLE_IDS = [
  'modern',
  'minimal',
  'luxury',
  'scandinavian',
  'industrial',
  'japandi',
  'classic',
  'contemporary',
] as const

export const PALETTE_IDS = [
  'warm',
  'neutral',
  'dark',
  'earthy',
  'monochrome',
] as const

export const LIGHTING_IDS = ['natural', 'warm', 'dramatic', 'soft'] as const

export const MOOD_IDS = ['calm', 'luxury', 'cozy', 'minimal', 'bold'] as const

export const PLAN_IDS = ['free', 'pro'] as const

export type RoomId = (typeof ROOM_IDS)[number]
export type StyleId = (typeof STYLE_IDS)[number]
export type PaletteId = (typeof PALETTE_IDS)[number]
export type LightingId = (typeof LIGHTING_IDS)[number]
export type MoodId = (typeof MOOD_IDS)[number]
export type PlanId = (typeof PLAN_IDS)[number]

/** Numeric hints consumed by the image pipeline. All optional, all composable. */
export interface TransformHints {
  hue?: number
  saturation?: number
  brightness?: number
  contrast?: number
  gamma?: number
  tint?: string
  tintAlpha?: number
  sharpen?: number
  vignette?: number
  warmth?: number
  bloom?: number
}

/** Flat colour set used when rendering generated scene artwork. */
export interface RenderPalette {
  wall: string
  ceiling: string
  floor: string
  wood: string
  textile: string
  accent: string
  metal: string
  plant: string
}

export interface RoomOption {
  id: RoomId
  name: string
  description: string
  scene: { kind: string; windows: number; plants: number }
}

export interface StyleOption {
  id: StyleId
  name: string
  tagline: string
  description: string
  keywords: string[]
  render: RenderPalette
  transform: TransformHints
}

export interface PaletteOption {
  id: PaletteId
  name: string
  description: string
  swatches: string[]
  transform: TransformHints
}

export interface LightingOption {
  id: LightingId
  name: string
  description: string
  transform: TransformHints
}

export interface MoodOption {
  id: MoodId
  name: string
  description: string
  adjectives: string[]
  transform: TransformHints
}

export interface PlanOption {
  id: PlanId
  name: string
  price: number
  credits: number
  tagline: string
  features: string[]
}

export const ROOMS = catalog.rooms as RoomOption[]
export const STYLES = catalog.styles as StyleOption[]
export const PALETTES = catalog.palettes as PaletteOption[]
export const LIGHTINGS = catalog.lighting as LightingOption[]
export const MOODS = catalog.moods as MoodOption[]
export const PLANS = catalog.plans as PlanOption[]

/* ── Lookups ──────────────────────────────────────────────────────────────── */

function indexBy<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((i) => [i.id, i]))
}

const roomIndex = indexBy(ROOMS)
const styleIndex = indexBy(STYLES)
const paletteIndex = indexBy(PALETTES)
const lightingIndex = indexBy(LIGHTINGS)
const moodIndex = indexBy(MOODS)
const planIndex = indexBy(PLANS)

export const getRoom = (id: string): RoomOption | undefined => roomIndex[id]
export const getStyle = (id: string): StyleOption | undefined => styleIndex[id]
export const getPalette = (id: string): PaletteOption | undefined =>
  paletteIndex[id]
export const getLighting = (id: string): LightingOption | undefined =>
  lightingIndex[id]
export const getMood = (id: string): MoodOption | undefined => moodIndex[id]
export const getPlan = (id: string): PlanOption =>
  planIndex[id] ?? (planIndex.free as PlanOption)

/** Human label for any catalog id, with a readable fallback. */
export function labelFor(
  kind: 'room' | 'style' | 'palette' | 'lighting' | 'mood',
  id: string,
): string {
  const found =
    kind === 'room'
      ? roomIndex[id]
      : kind === 'style'
        ? styleIndex[id]
        : kind === 'palette'
          ? paletteIndex[id]
          : kind === 'lighting'
            ? lightingIndex[id]
            : moodIndex[id]

  if (found) return found.name
  return id
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/* ── Type guards ──────────────────────────────────────────────────────────── */

export const isRoomId = (v: string): v is RoomId =>
  ROOM_IDS.includes(v as RoomId)
export const isStyleId = (v: string): v is StyleId =>
  STYLE_IDS.includes(v as StyleId)
export const isPaletteId = (v: string): v is PaletteId =>
  PALETTE_IDS.includes(v as PaletteId)
export const isLightingId = (v: string): v is LightingId =>
  LIGHTING_IDS.includes(v as LightingId)
export const isMoodId = (v: string): v is MoodId =>
  MOOD_IDS.includes(v as MoodId)
