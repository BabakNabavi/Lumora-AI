import 'server-only'

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { UnauthorizedError, toErrorResponse, ValidationError } from '@/lib/errors'
import { fieldErrors } from '@/lib/validation/schemas'
import { getCurrentUser, type CurrentUser } from '@/lib/auth/current-user'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Wraps a route handler so every failure path produces the same JSON envelope.
 * Zod failures are converted to per-field messages the forms can render
 * directly, rather than leaking validator internals to the client.
 */
export function route<Args extends unknown[]>(
  handler: (request: Request, ...args: Args) => Promise<Response>,
) {
  return async (request: Request, ...args: Args): Promise<Response> => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      if (error instanceof ZodError) {
        const validation = new ValidationError(
          'Please check the highlighted fields.',
          fieldErrors(error),
        )
        const { status, body } = toErrorResponse(validation)
        return NextResponse.json(body, { status })
      }

      const { status, body } = toErrorResponse(error)
      return NextResponse.json(body, { status })
    }
  }
}

/** Throws rather than redirecting — route handlers answer with 401, not HTML. */
export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}

export async function requireApiAdmin(): Promise<CurrentUser> {
  const user = await requireApiUser()
  if (user.role !== 'ADMIN') {
    throw new UnauthorizedError('Administrator access is required.')
  }
  return user
}

/** Best-effort client identity for rate limiting. */
export function clientKey(request: Request): string {
  const headers = request.headers
  const forwarded = headers.get('x-forwarded-for')
  return (
    forwarded?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'local'
  )
}
