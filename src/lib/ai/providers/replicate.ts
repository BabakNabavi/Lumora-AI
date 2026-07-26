import 'server-only'

import sharp from 'sharp'

import { buildDescription, buildInsights } from '../insights'
import { buildNegativePrompt, buildPrompt } from '../prompt'
import {
  AIProviderError,
  type AIProvider,
  type GenerationInput,
  type GenerationResult,
} from '../types'

const API = 'https://api.replicate.com/v1/predictions'
const POLL_INTERVAL_MS = 1500
const TIMEOUT_MS = 180_000

interface Prediction {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string[] | string
  error?: string
}

/**
 * Replicate image-to-image provider (SDXL-family interior models).
 *
 * The uploaded photograph is sent as a data URI so no public URL has to exist
 * first, and the model is pinned by version through the environment — swapping
 * to a different interior model never touches this file.
 */
export class ReplicateProvider implements AIProvider {
  readonly name = 'replicate'
  readonly requiresApiKey = true

  isConfigured(): boolean {
    return Boolean(
      process.env.REPLICATE_API_TOKEN && process.env.REPLICATE_MODEL_VERSION,
    )
  }

  async generate(input: GenerationInput): Promise<GenerationResult> {
    const startedAt = Date.now()
    const token = process.env.REPLICATE_API_TOKEN
    const version = process.env.REPLICATE_MODEL_VERSION

    if (!token || !version) {
      throw new AIProviderError(
        'REPLICATE_API_TOKEN and REPLICATE_MODEL_VERSION must be set.',
        this.name,
      )
    }

    const prompt = buildPrompt(input.brief)
    const dataUri = `data:${input.image.contentType};base64,${input.image.body.toString('base64')}`

    const created = await this.request<Prediction>(API, token, {
      method: 'POST',
      body: JSON.stringify({
        version,
        input: {
          image: dataUri,
          prompt,
          negative_prompt: buildNegativePrompt(),
          // Low enough to preserve the room's geometry, high enough to restyle.
          prompt_strength: 0.72,
          guidance_scale: 7.5,
          num_inference_steps: 32,
          seed: input.seed ?? undefined,
        },
      }),
      signal: input.signal,
    })

    const finished = await this.poll(created.id, token, input.signal)

    const outputUrl = Array.isArray(finished.output)
      ? finished.output[finished.output.length - 1]
      : finished.output

    if (!outputUrl) {
      throw new AIProviderError(
        finished.error ?? 'Replicate returned no image.',
        this.name,
      )
    }

    const imageRes = await fetch(outputUrl, { signal: input.signal })
    if (!imageRes.ok) {
      throw new AIProviderError(
        `Could not download the generated image (${imageRes.status}).`,
        this.name,
      )
    }

    const raw = Buffer.from(await imageRes.arrayBuffer())
    const { data, info } = await sharp(raw)
      .webp({ quality: 92 })
      .toBuffer({ resolveWithObject: true })

    return {
      image: {
        body: data,
        contentType: 'image/webp',
        width: info.width,
        height: info.height,
      },
      description: buildDescription(input.brief, input.seed ?? 0),
      insights: buildInsights(input.brief, input.seed ?? 0),
      provider: this.name,
      model: version,
      prompt,
      durationMs: Date.now() - startedAt,
    }
  }

  private async request<T>(
    url: string,
    token: string,
    init: RequestInit = {},
  ): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new AIProviderError(
        `Replicate request failed (${res.status}): ${await res.text()}`,
        this.name,
      )
    }
    return (await res.json()) as T
  }

  private async poll(
    id: string,
    token: string,
    signal?: AbortSignal,
  ): Promise<Prediction> {
    const deadline = Date.now() + TIMEOUT_MS

    while (Date.now() < deadline) {
      if (signal?.aborted) {
        throw new AIProviderError('Generation cancelled.', this.name)
      }

      const prediction = await this.request<Prediction>(
        `${API}/${id}`,
        token,
        { signal },
      )

      if (prediction.status === 'succeeded') return prediction
      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        throw new AIProviderError(
          prediction.error ?? `Prediction ${prediction.status}.`,
          this.name,
        )
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    }

    throw new AIProviderError('Generation timed out.', this.name)
  }
}
