import 'server-only'

import { randomUUID } from 'node:crypto'

import { env } from '@/lib/env'
import { LocalStorageDriver } from './drivers/local'
import { S3StorageDriver } from './drivers/s3'
import { StorageNotConfiguredError, type StorageDriver } from './types'

export * from './types'

let driver: StorageDriver | null = null

/**
 * Resolves the configured storage backend once per process. Callers only ever
 * see the `StorageDriver` interface, so nothing above this line knows whether
 * bytes land on disk or in a bucket.
 */
export function storage(): StorageDriver {
  if (driver) return driver

  const config = env()

  switch (config.STORAGE_DRIVER) {
    case 's3': {
      if (
        !config.S3_BUCKET ||
        !config.S3_ACCESS_KEY_ID ||
        !config.S3_SECRET_ACCESS_KEY
      ) {
        // Half-configured is the same class of problem as unconfigured, and
        // reaches the user the same way.
        throw new StorageNotConfiguredError(
          'STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.',
        )
      }
      driver = new S3StorageDriver({
        bucket: config.S3_BUCKET,
        region: config.S3_REGION,
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
        endpoint: config.S3_ENDPOINT || undefined,
        publicUrl: config.S3_PUBLIC_URL || undefined,
      })
      break
    }
    case 'local':
    default:
      // Serverless filesystems are read-only outside /tmp, and /tmp does not
      // survive between invocations — an upload written there is gone before
      // it can be read back. Fail with the fix rather than an opaque EROFS.
      if (process.env.VERCEL) {
        throw new StorageNotConfiguredError(
          'STORAGE_DRIVER=local cannot be used on Vercel: the filesystem is ephemeral, so uploads and renders would not survive the request. Set STORAGE_DRIVER=s3 with S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY (AWS S3, Cloudflare R2 and Backblaze B2 all work).',
        )
      }
      driver = new LocalStorageDriver(config.STORAGE_LOCAL_DIR)
  }

  return driver
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
}

export function extensionFor(contentType: string): string {
  return EXTENSIONS[contentType] ?? 'bin'
}

/**
 * Object keys are namespaced by owner and purpose so a bucket can be browsed,
 * lifecycle-ruled and cost-attributed without consulting the database.
 *
 *   uploads/{ownerId}/{uuid}.jpg
 *   renders/{ownerId}/{uuid}.webp
 */
export function buildKey(
  kind: 'uploads' | 'renders',
  ownerId: string | null,
  contentType: string,
): string {
  return `${kind}/${ownerId ?? 'guest'}/${randomUUID()}.${extensionFor(contentType)}`
}
