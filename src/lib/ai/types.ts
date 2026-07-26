import type {
  LightingId,
  MoodId,
  PaletteId,
  RoomId,
  StyleId,
} from '@/config/design-options'

/** Everything the user chose in the studio. */
export interface DesignBrief {
  roomType: RoomId
  style: StyleId
  palette: PaletteId
  lighting: LightingId
  mood: MoodId
}

export interface SourceImage {
  body: Buffer
  contentType: string
}

export interface RenderedImage {
  body: Buffer
  contentType: string
  width: number
  height: number
}

export interface DesignInsight {
  title: string
  body: string
}

export interface GenerationInput {
  image: SourceImage
  brief: DesignBrief
  /** Deterministic variation — a "generate another version" bumps this. */
  seed?: number
  signal?: AbortSignal
}

export interface GenerationResult {
  image: RenderedImage
  /** One-paragraph narrative shown under the comparison. */
  description: string
  insights: DesignInsight[]
  provider: string
  model?: string
  prompt: string
  durationMs: number
}

/**
 * The contract every image provider implements.
 *
 * Swapping providers is a configuration change: nothing in the API routes, the
 * services or the UI refers to a concrete provider. A new backend means one new
 * file here plus one line in the registry.
 */
export interface AIProvider {
  readonly name: string
  /** False for providers that work offline (the mock renderer). */
  readonly requiresApiKey: boolean
  /** Whether the environment currently holds everything this provider needs. */
  isConfigured(): boolean
  generate(input: GenerationInput): Promise<GenerationResult>
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}
