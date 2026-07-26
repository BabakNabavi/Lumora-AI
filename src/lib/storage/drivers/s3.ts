import 'server-only'

import { signRequest } from '../sigv4'
import {
  assertSafeKey,
  StorageError,
  type FetchedObject,
  type PutObjectInput,
  type StorageDriver,
  type StoredObject,
} from '../types'

export interface S3Config {
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  /** Custom endpoint for R2 / MinIO / B2. Omit for AWS S3. */
  endpoint?: string
  /** CDN or public bucket origin used to build browser-facing URLs. */
  publicUrl?: string
}

/**
 * S3-compatible driver. Works against AWS S3, Cloudflare R2, MinIO and
 * Backblaze B2 — anything speaking the S3 REST API with SigV4.
 *
 * Switching to it is an environment change, not a code change:
 *   STORAGE_DRIVER=s3  S3_BUCKET=…  S3_ACCESS_KEY_ID=…  S3_SECRET_ACCESS_KEY=…
 */
export class S3StorageDriver implements StorageDriver {
  readonly name = 's3'

  constructor(private readonly config: S3Config) {}

  private endpointFor(key: string): string {
    const safe = assertSafeKey(key)
    const { bucket, region, endpoint } = this.config

    if (endpoint) {
      const base = endpoint.replace(/\/+$/, '')
      return `${base}/${bucket}/${safe}`
    }
    const host =
      region === 'us-east-1'
        ? `${bucket}.s3.amazonaws.com`
        : `${bucket}.s3.${region}.amazonaws.com`
    return `https://${host}/${safe}`
  }

  private async send(
    method: 'GET' | 'PUT' | 'HEAD' | 'DELETE',
    key: string,
    body?: Buffer,
    extraHeaders?: Record<string, string>,
  ): Promise<Response> {
    const url = this.endpointFor(key)
    const headers = signRequest({
      method,
      url,
      region: this.config.region,
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
      headers: extraHeaders,
      body: body ?? '',
    })

    return fetch(url, {
      method,
      headers,
      body: body as BodyInit | undefined,
      cache: 'no-store',
    })
  }

  async put({
    key,
    body,
    contentType,
    cacheControl = 'public, max-age=31536000, immutable',
  }: PutObjectInput): Promise<StoredObject> {
    const res = await this.send('PUT', key, body, {
      'content-type': contentType,
      'content-length': String(body.byteLength),
      'cache-control': cacheControl,
    })

    if (!res.ok) {
      throw new StorageError(
        `S3 PUT failed for ${key}: ${res.status} ${await res.text()}`,
      )
    }

    return {
      key: assertSafeKey(key),
      url: this.url(key),
      size: body.byteLength,
      contentType,
    }
  }

  async get(key: string): Promise<FetchedObject | null> {
    const res = await this.send('GET', key)
    if (res.status === 404) return null
    if (!res.ok) {
      throw new StorageError(`S3 GET failed for ${key}: ${res.status}`)
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    return {
      body: buffer,
      contentType: res.headers.get('content-type') ?? 'application/octet-stream',
      size: buffer.byteLength,
    }
  }

  async delete(key: string): Promise<void> {
    const res = await this.send('DELETE', key)
    if (!res.ok && res.status !== 404) {
      throw new StorageError(`S3 DELETE failed for ${key}: ${res.status}`)
    }
  }

  async exists(key: string): Promise<boolean> {
    const res = await this.send('HEAD', key)
    return res.ok
  }

  url(key: string): string {
    const safe = assertSafeKey(key)
    if (this.config.publicUrl) {
      return `${this.config.publicUrl.replace(/\/+$/, '')}/${safe}`
    }
    return this.endpointFor(safe)
  }
}
