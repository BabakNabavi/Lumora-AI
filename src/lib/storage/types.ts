import { AppError } from '@/lib/errors'

export interface StoredObject {
  key: string
  url: string
  size: number
  contentType: string
}

export interface PutObjectInput {
  key: string
  body: Buffer
  contentType: string
  /** Cache-Control to persist with the object. Defaults to one immutable year. */
  cacheControl?: string
}

export interface FetchedObject {
  body: Buffer
  contentType: string
  size: number
}

/**
 * Every storage backend implements this. The application never touches a
 * filesystem path or a bucket name directly — it deals in opaque keys and asks
 * the driver for a URL when it needs one.
 */
export interface StorageDriver {
  readonly name: string

  put(input: PutObjectInput): Promise<StoredObject>
  get(key: string): Promise<FetchedObject | null>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>

  /** Public (or route-proxied) URL for a key. */
  url(key: string): string
}

export class StorageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'StorageError'
  }
}

/**
 * A malformed or traversing key is a bad request, not a server fault — it has
 * to serialise as 4xx so the file route does not report an internal error when
 * it successfully refuses an attack.
 */
export class UnsafeKeyError extends AppError {
  constructor(key: string) {
    super('That file path is not valid.', 'unsafe_key', 400, { key })
  }
}

/**
 * Keys are always POSIX-style, lower-case, and may not escape their prefix.
 * Enforced centrally so no driver has to re-derive traversal rules.
 */
export function assertSafeKey(key: string): string {
  const normalised = key.replace(/\\/g, '/').replace(/^\/+/, '')

  if (
    normalised.length === 0 ||
    normalised.length > 400 ||
    normalised.split('/').some((seg) => seg === '.' || seg === '..' || seg === '') ||
    /[\0<>:"|?*]/.test(normalised)
  ) {
    throw new UnsafeKeyError(key)
  }

  return normalised
}
