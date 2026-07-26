import 'server-only'

import sharp, { type OutputInfo, type OverlayOptions } from 'sharp'

import {
  getLighting,
  getMood,
  getPalette,
  getStyle,
  type TransformHints,
} from '@/config/design-options'
import { clamp } from '@/lib/utils'

import { buildDescription, buildInsights } from '../insights'
import { buildPrompt } from '../prompt'
import {
  AIProviderError,
  type AIProvider,
  type GenerationInput,
  type GenerationResult,
} from '../types'

const MAX_EDGE = 1600
/**
 * The studio's generation screen narrates four analysis stages. The renderer
 * itself finishes in well under a second, so a floor is applied to keep the
 * pacing of that screen honest rather than flashing past.
 */
const MIN_DURATION_MS = Number(process.env.MOCK_MIN_DURATION_MS ?? 4200)

/** Multiplicative hints compose; additive ones accumulate. */
function compose(...layers: (TransformHints | undefined)[]): Required<
  Pick<
    TransformHints,
    | 'hue'
    | 'saturation'
    | 'brightness'
    | 'contrast'
    | 'gamma'
    | 'sharpen'
    | 'vignette'
    | 'warmth'
    | 'bloom'
  >
> & { tint?: string; tintAlpha: number } {
  const out = {
    hue: 0,
    saturation: 1,
    brightness: 1,
    contrast: 1,
    gamma: 1,
    sharpen: 0,
    vignette: 0,
    warmth: 0,
    bloom: 0,
    tint: undefined as string | undefined,
    tintAlpha: 0,
  }

  for (const layer of layers) {
    if (!layer) continue
    out.hue += layer.hue ?? 0
    out.saturation *= layer.saturation ?? 1
    out.brightness *= layer.brightness ?? 1
    out.contrast *= layer.contrast ?? 1
    out.gamma *= layer.gamma ?? 1
    out.sharpen += layer.sharpen ?? 0
    out.vignette = Math.max(out.vignette, layer.vignette ?? 0)
    out.warmth += layer.warmth ?? 0
    out.bloom = Math.max(out.bloom, layer.bloom ?? 0)
    if (layer.tint) {
      // Later layers win the hue, but strength accumulates.
      out.tint = layer.tint
      out.tintAlpha = clamp(out.tintAlpha + (layer.tintAlpha ?? 0), 0, 0.45)
    }
  }

  return out
}

function vignetteSvg(w: number, h: number, strength: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs><radialGradient id="v" cx="0.5" cy="0.46" r="0.78">
        <stop offset="45%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#${Math.round((1 - strength) * 255)
          .toString(16)
          .padStart(2, '0')
          .repeat(3)}"/>
      </radialGradient></defs>
      <rect width="${w}" height="${h}" fill="url(#v)"/>
    </svg>`,
  )
}

function tintSvg(w: number, h: number, colour: string, alpha: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="${colour}" fill-opacity="${alpha.toFixed(3)}"/>
    </svg>`,
  )
}

function lightWashSvg(
  w: number,
  h: number,
  warmth: number,
  bloom: number,
): Buffer {
  const warmHex = warmth >= 0 ? '#ffd7a1' : '#a9c6e8'
  const a = clamp(Math.abs(warmth) / 30, 0, 0.34)
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <defs>
        <radialGradient id="b" cx="0.18" cy="0.24" r="0.75">
          <stop offset="0%" stop-color="#fff6e4" stop-opacity="${clamp(bloom, 0, 0.5).toFixed(3)}"/>
          <stop offset="100%" stop-color="#fff6e4" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="w" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stop-color="${warmHex}" stop-opacity="${a.toFixed(3)}"/>
          <stop offset="100%" stop-color="${warmHex}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#w)"/>
      <rect width="${w}" height="${h}" fill="url(#b)"/>
    </svg>`,
  )
}

/**
 * Offline image provider.
 *
 * It is a *mock* in that no model is called — but it is not a stub: it runs a
 * real, deterministic colour-grading pipeline over the uploaded photograph,
 * driven by the same style / palette / lighting / mood coefficients the catalog
 * defines. Every combination produces a visibly different, plausible result, so
 * the whole product — comparison slider, gallery, downloads — is genuinely
 * exercised without an API key or a network connection.
 */
export class MockAIProvider implements AIProvider {
  readonly name = 'mock'
  readonly requiresApiKey = false

  isConfigured(): boolean {
    return true
  }

  async generate(input: GenerationInput): Promise<GenerationResult> {
    const startedAt = Date.now()
    const { brief, seed = 0 } = input

    const style = getStyle(brief.style)
    const palette = getPalette(brief.palette)
    const lighting = getLighting(brief.lighting)
    const mood = getMood(brief.mood)

    if (!style || !palette || !lighting || !mood) {
      throw new AIProviderError('Unknown catalog selection in brief', this.name)
    }

    const t = compose(
      style.transform,
      palette.transform,
      lighting.transform,
      mood.transform,
    )

    // A "generate another version" nudges the grade so repeat runs differ.
    const drift = seed === 0 ? 0 : (((seed * 2654435761) >>> 0) % 1000) / 1000
    const hue = Math.round(t.hue + (drift - 0.5) * 10)
    // The multiply tint costs roughly `tintAlpha` of exposure; restoring it here
    // keeps every palette landing at a comparable overall brightness.
    const tintLoss = t.tint ? t.tintAlpha * 0.55 : 0
    const brightness = clamp(
      t.brightness * (1 + tintLoss) * (1 + (drift - 0.5) * 0.06),
      0.55,
      1.6,
    )
    const saturation = clamp(t.saturation * (1 + (drift - 0.5) * 0.1), 0.1, 2)
    const contrast = clamp(t.contrast, 0.6, 1.9)

    let normalised: { data: Buffer; info: OutputInfo }
    try {
      normalised = await sharp(input.image.body, { failOn: 'none' })
        .rotate() // honour EXIF orientation before anything else
        .resize({
          width: MAX_EDGE,
          height: MAX_EDGE,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer({ resolveWithObject: true })
    } catch (error) {
      throw new AIProviderError(
        'The uploaded file could not be decoded as an image.',
        this.name,
        error,
      )
    }

    const { width: w, height: h } = normalised.info

    let pipeline = sharp(normalised.data)
      .modulate({ brightness, saturation, hue })
      // out = a·in + b, pivoted on mid-grey so contrast doesn't shift exposure
      .linear(contrast, -(128 * (contrast - 1)))

    // sharp's gamma only accepts 1.0–3.0; below 1 it is applied as its inverse
    // on the output side, which is the visual equivalent for our purposes.
    if (t.gamma > 1.02) pipeline = pipeline.gamma(clamp(t.gamma, 1.001, 3))

    if (t.sharpen > 0.05) {
      pipeline = pipeline.sharpen({ sigma: clamp(t.sharpen * 0.9, 0.3, 3) })
    }

    const overlays: OverlayOptions[] = []

    if (t.tint && t.tintAlpha > 0.01) {
      // Multiply rather than soft-light: soft-light can only push an existing
      // hue around, so a neutral room stays neutral no matter which palette is
      // chosen. Multiplying genuinely carries the palette into the greys, and
      // the exposure lost to it is added back in the `brightness` term above.
      overlays.push({
        input: tintSvg(w, h, t.tint, t.tintAlpha),
        blend: 'multiply',
      })
    }

    if (t.warmth !== 0 || t.bloom > 0.01) {
      overlays.push({
        input: lightWashSvg(w, h, t.warmth, t.bloom),
        blend: 'screen',
      })
    }

    if (t.vignette > 0.02) {
      overlays.push({
        input: vignetteSvg(w, h, clamp(t.vignette, 0, 0.55)),
        blend: 'multiply',
      })
    }

    const body = await pipeline
      .composite(overlays)
      .webp({ quality: 92, effort: 4 })
      .toBuffer()

    const elapsed = Date.now() - startedAt
    if (elapsed < MIN_DURATION_MS) {
      await new Promise((r) => setTimeout(r, MIN_DURATION_MS - elapsed))
    }

    return {
      image: { body, contentType: 'image/webp', width: w, height: h },
      description: buildDescription(brief, seed),
      insights: buildInsights(brief, seed),
      provider: this.name,
      model: 'local-grade-v1',
      prompt: buildPrompt(brief),
      durationMs: Date.now() - startedAt,
    }
  }
}
