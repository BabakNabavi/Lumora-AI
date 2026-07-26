import 'server-only'

import sharp, { type Metadata } from 'sharp'

import { uploadConfig } from '@/config/site'
import { ValidationError } from '@/lib/errors'
import { buildKey, storage } from '@/lib/storage'

export interface AcceptedUpload {
  key: string
  url: string
  width: number
  height: number
  size: number
  contentType: string
}

const MAGIC: { type: string; test: (b: Buffer) => boolean }[] = [
  { type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    type: 'image/png',
    test: (b) =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  {
    type: 'image/webp',
    test: (b) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
]

/**
 * Accepts a browser upload.
 *
 * The declared MIME type is treated as a hint only — the real type is read from
 * the file's magic bytes and then confirmed by decoding it, so a renamed
 * executable or an SVG carrying script never reaches storage.
 */
export async function acceptUpload(
  file: File,
  ownerId: string | null,
): Promise<AcceptedUpload> {
  if (file.size === 0) {
    throw new ValidationError('That file is empty.')
  }
  if (file.size > uploadConfig.maxBytes) {
    throw new ValidationError(
      `That image is larger than ${uploadConfig.maxLabel}. Try a smaller export.`,
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const sniffed = MAGIC.find((m) => m.test(buffer))?.type

  if (!sniffed) {
    throw new ValidationError(
      `Only ${uploadConfig.acceptLabel} images are supported.`,
    )
  }

  let meta: Metadata
  try {
    meta = await sharp(buffer, { failOn: 'error' }).metadata()
  } catch {
    throw new ValidationError('That image could not be read. Try another file.')
  }

  const width = meta.width ?? 0
  const height = meta.height ?? 0

  if (width < uploadConfig.minDimension || height < uploadConfig.minDimension) {
    throw new ValidationError(
      `The image needs to be at least ${uploadConfig.minDimension}px on both sides — this one is ${width}×${height}.`,
    )
  }
  if (width > uploadConfig.maxDimension || height > uploadConfig.maxDimension) {
    throw new ValidationError(
      `The image is larger than ${uploadConfig.maxDimension}px on a side. Please downscale it first.`,
    )
  }

  // Re-encode rather than storing the original bytes: this strips EXIF (which
  // can carry GPS coordinates), bakes in the orientation, and normalises every
  // upload to one format for the rest of the pipeline.
  const normalised = await sharp(buffer)
    .rotate()
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 92 })
    .toBuffer({ resolveWithObject: true })

  const key = buildKey('uploads', ownerId, 'image/webp')
  const stored = await storage().put({
    key,
    body: normalised.data,
    contentType: 'image/webp',
  })

  return {
    key: stored.key,
    url: stored.url,
    width: normalised.info.width,
    height: normalised.info.height,
    size: stored.size,
    contentType: 'image/webp',
  }
}
