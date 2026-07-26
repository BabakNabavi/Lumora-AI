import { NextResponse } from 'next/server'

import { NotFoundError } from '@/lib/errors'
import { storage } from '@/lib/storage'
import { ok as _ok, requireApiUser, route } from '@/server/http'
import { requireOwned } from '@/server/services/designs'

/**
 * Streams the rendered image back as an attachment with a readable filename,
 * rather than letting the browser save `a1b2c3.webp` from the storage URL.
 */
export const GET = route(
  async (request, context: { params: Promise<{ id: string }> }) => {
    const user = await requireApiUser()
    const { id } = await context.params
    const design = await requireOwned(id, user.id)

    const wantOriginal =
      new URL(request.url).searchParams.get('variant') === 'original'
    const key = wantOriginal ? design.originalKey : design.resultKey

    if (!key) {
      throw new NotFoundError('This design has not finished rendering yet.')
    }

    const object = await storage().get(key)
    if (!object) throw new NotFoundError('That file is no longer available.')

    const slug =
      design.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'design'
    const suffix = wantOriginal ? 'original' : 'ai'
    const extension = object.contentType.split('/')[1] ?? 'webp'

    return new NextResponse(new Uint8Array(object.body), {
      headers: {
        'Content-Type': object.contentType,
        'Content-Length': String(object.size),
        'Content-Disposition': `attachment; filename="${slug}-${suffix}.${extension}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    })
  },
)
