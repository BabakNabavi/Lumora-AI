import 'server-only'

import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  assertSafeKey,
  StorageError,
  type FetchedObject,
  type PutObjectInput,
  type StorageDriver,
  type StoredObject,
} from '../types'

/**
 * Filesystem driver — the default for local development and for single-node
 * deployments with a persistent volume. Objects live outside `public/` and are
 * served through `/api/files/[...key]`, so access can be authorised rather than
 * being world-readable by virtue of sitting in the static directory.
 */
export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local'
  private readonly root: string

  constructor(rootDir: string) {
    this.root = path.resolve(process.cwd(), rootDir)
  }

  private resolve(key: string): string {
    const safe = assertSafeKey(key)
    const abs = path.resolve(this.root, safe)

    // Defence in depth: even with a safe key, never leave the root.
    if (abs !== this.root && !abs.startsWith(this.root + path.sep)) {
      throw new StorageError(`Resolved path escapes storage root: ${key}`)
    }
    return abs
  }

  async put({ key, body, contentType }: PutObjectInput): Promise<StoredObject> {
    const abs = this.resolve(key)
    await mkdir(path.dirname(abs), { recursive: true })
    await writeFile(abs, body)
    await writeFile(`${abs}.meta`, JSON.stringify({ contentType }), 'utf8')

    return {
      key: assertSafeKey(key),
      url: this.url(key),
      size: body.byteLength,
      contentType,
    }
  }

  async get(key: string): Promise<FetchedObject | null> {
    const abs = this.resolve(key)
    try {
      const body = await readFile(abs)
      let contentType = 'application/octet-stream'
      try {
        const meta = JSON.parse(await readFile(`${abs}.meta`, 'utf8')) as {
          contentType?: string
        }
        if (meta.contentType) contentType = meta.contentType
      } catch {
        contentType = guessContentType(abs)
      }
      return { body, contentType, size: body.byteLength }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw new StorageError(`Failed to read ${key}`, error)
    }
  }

  async delete(key: string): Promise<void> {
    const abs = this.resolve(key)
    await rm(abs, { force: true })
    await rm(`${abs}.meta`, { force: true })
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolve(key))
      return true
    } catch {
      return false
    }
  }

  url(key: string): string {
    return `/api/files/${assertSafeKey(key)}`
  }
}

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
}

function guessContentType(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}
