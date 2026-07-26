import { NextResponse } from 'next/server'

import { NotFoundError } from '@/lib/errors'
import { storage } from '@/lib/storage'
import { route } from '@/server/http'

/**
 * Serves objects held by the local storage driver.
 *
 * Uploads and renders live outside `public/` so they are not world-readable
 * simply by existing. Keys are unguessable UUIDs, which is what makes a shared
 * design link work without an account; anything stronger would break sharing.
 * Switching `STORAGE_DRIVER` to s3 bypasses this route entirely — the driver
 * returns bucket URLs instead.
 */
export const GET = route(
  async (_request, context: { params: Promise<{ key: string[] }> }) => {
    const { key } = await context.params
    const object = await storage().get(key.join('/'))

    if (!object) throw new NotFoundError('That file is no longer available.')

    return new NextResponse(new Uint8Array(object.body), {
      headers: {
        'Content-Type': object.contentType,
        'Content-Length': String(object.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  },
)
