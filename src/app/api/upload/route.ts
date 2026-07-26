import { getCurrentUser } from '@/lib/auth/current-user'
import { ValidationError } from '@/lib/errors'
import { consume, limits } from '@/lib/rate-limit'
import { clientKey, ok, route } from '@/server/http'
import { acceptUpload } from '@/server/services/uploads'

export const runtime = 'nodejs'

/**
 * Accepts the room photograph.
 *
 * Uploading is allowed without an account so the guest demo can run; the
 * expensive step (generation) is where identity and credits are enforced.
 */
export const POST = route(async (request) => {
  consume(`upload:${clientKey(request)}`, limits.upload)

  const user = await getCurrentUser()
  const form = await request.formData()
  const file = form.get('file')

  if (!(file instanceof File)) {
    throw new ValidationError('No image was included in the request.')
  }

  const upload = await acceptUpload(file, user?.id ?? null)

  return ok({
    uploadId: upload.key,
    url: upload.url,
    width: upload.width,
    height: upload.height,
    size: upload.size,
  })
})
