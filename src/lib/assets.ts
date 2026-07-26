import 'server-only'

import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Reads the artwork manifest written by `npm run assets:generate`.
 *
 * Each generated image ships with its intrinsic dimensions and a 16px base64
 * LQIP, so `<Image>` can reserve exact space and fade in from a real blur
 * instead of a grey box — without a build-time import of a gitignored file.
 */

export interface Plate {
  src: string
  width: number
  height: number
  blurDataURL?: string
}

export interface InspirationEntry {
  slug: string
  title: string
  room: string
  style: string
  palette: string
  lighting: string
  mood: string
}

interface Manifest {
  generatedAt: string
  inspirations: InspirationEntry[]
  assets: Record<string, Plate>
}

const MANIFEST_PATH = path.join(
  process.cwd(),
  'public',
  'assets',
  'generated',
  'manifest.json',
)

let manifest: Manifest | null = null

function load(): Manifest {
  if (manifest) return manifest
  try {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest
  } catch {
    // A missing manifest must not take a page down — images still resolve by
    // path, they just lose their placeholder and intrinsic size hints.
    console.warn(
      '[assets] manifest.json not found — run `npm run assets:generate`.',
    )
    manifest = { generatedAt: '', inspirations: [], assets: {} }
  }
  return manifest
}

const FALLBACK: Omit<Plate, 'src'> = { width: 1600, height: 1200 }

export function plate(src: string): Plate {
  return load().assets[src] ?? { src, ...FALLBACK }
}

export const heroPlates = () => ({
  before: plate('/assets/generated/hero/before.webp'),
  after: plate('/assets/generated/hero/after.webp'),
})

export const demoPlates = () => ({
  before: plate('/assets/generated/demo/before.webp'),
  after: plate('/assets/generated/demo/after.webp'),
})

export const stylePlate = (styleId: string) =>
  plate(`/assets/generated/styles/${styleId}.webp`)

export const roomPlate = (roomId: string) =>
  plate(`/assets/generated/rooms/${roomId}.webp`)

export const inspirationPlate = (slug: string) =>
  plate(`/assets/generated/inspirations/${slug}.webp`)

export function inspirations(): (InspirationEntry & { plate: Plate })[] {
  return load().inspirations.map((entry) => ({
    ...entry,
    plate: inspirationPlate(entry.slug),
  }))
}
