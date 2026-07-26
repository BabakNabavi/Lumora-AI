import 'server-only'

import sharp from 'sharp'

import { buildDescription, buildInsights } from '../insights'
import { buildPrompt } from '../prompt'
import {
  AIProviderError,
  type AIProvider,
  type DesignInsight,
  type GenerationInput,
  type GenerationResult,
} from '../types'

const IMAGES_URL = 'https://api.openai.com/v1/images/edits'
const CHAT_URL = 'https://api.openai.com/v1/chat/completions'

/**
 * OpenAI provider — image edit for the render, plus a vision pass that writes
 * the design commentary from the *actual* result rather than from the brief.
 *
 * If the commentary call fails the render is still returned; the deterministic
 * insight writer covers the gap, so a partial outage degrades copy quality
 * instead of failing the generation.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  readonly requiresApiKey = true

  isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY)
  }

  async generate(input: GenerationInput): Promise<GenerationResult> {
    const startedAt = Date.now()
    const apiKey = process.env.OPENAI_API_KEY
    const imageModel = process.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1'

    if (!apiKey) {
      throw new AIProviderError('OPENAI_API_KEY is not set.', this.name)
    }

    const prompt = buildPrompt(input.brief)

    // gpt-image-1 edits expect PNG input.
    const png = await sharp(input.image.body, { failOn: 'none' })
      .rotate()
      .resize({ width: 1536, height: 1536, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()

    const form = new FormData()
    form.append('model', imageModel)
    form.append('prompt', prompt)
    form.append('size', 'auto')
    form.append('quality', 'high')
    form.append(
      'image',
      new Blob([new Uint8Array(png)], { type: 'image/png' }),
      'room.png',
    )

    const res = await fetch(IMAGES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: input.signal,
      cache: 'no-store',
    })

    if (!res.ok) {
      throw new AIProviderError(
        `OpenAI image edit failed (${res.status}): ${await res.text()}`,
        this.name,
      )
    }

    const payload = (await res.json()) as {
      data?: { b64_json?: string; url?: string }[]
    }
    const first = payload.data?.[0]

    let raw: Buffer
    if (first?.b64_json) {
      raw = Buffer.from(first.b64_json, 'base64')
    } else if (first?.url) {
      const download = await fetch(first.url, { signal: input.signal })
      raw = Buffer.from(await download.arrayBuffer())
    } else {
      throw new AIProviderError('OpenAI returned no image data.', this.name)
    }

    const { data, info } = await sharp(raw)
      .webp({ quality: 92 })
      .toBuffer({ resolveWithObject: true })

    const commentary = await this.describe(apiKey, data, input, prompt).catch(
      () => null,
    )

    return {
      image: {
        body: data,
        contentType: 'image/webp',
        width: info.width,
        height: info.height,
      },
      description:
        commentary?.description ??
        buildDescription(input.brief, input.seed ?? 0),
      insights: commentary?.insights?.length
        ? commentary.insights
        : buildInsights(input.brief, input.seed ?? 0),
      provider: this.name,
      model: imageModel,
      prompt,
      durationMs: Date.now() - startedAt,
    }
  }

  /** Vision pass: reads the rendered image and writes the result-page copy. */
  private async describe(
    apiKey: string,
    image: Buffer,
    input: GenerationInput,
    prompt: string,
  ): Promise<{ description: string; insights: DesignInsight[] } | null> {
    const model = process.env.OPENAI_VISION_MODEL ?? 'gpt-4.1-mini'

    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: input.signal,
      cache: 'no-store',
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You are an interior architect writing short, specific notes for a client. Never use marketing language. Reply as JSON: {"description": string, "insights": [{"title": string, "body": string}]} with exactly 4 insights, each body 1–2 sentences.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `This interior was generated from the brief below. Describe what was actually done in the image.\n\n${prompt}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/webp;base64,${image.toString('base64')}`,
                },
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) return null

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = json.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content) as {
      description?: string
      insights?: DesignInsight[]
    }

    if (!parsed.description) return null
    return {
      description: parsed.description,
      insights: (parsed.insights ?? []).filter((i) => i?.title && i?.body),
    }
  }
}
