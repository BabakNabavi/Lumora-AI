/**
 * Application errors carry an HTTP status and a stable code so a route handler
 * can serialise any of them the same way, and the client can branch on `code`
 * without string-matching messages.
 */
export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number = 400,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'validation_error', 422, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'You need to be signed in to do that.') {
    super(message, 'unauthorized', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to that.') {
    super(message, 'forbidden', 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found.') {
    super(message, 'not_found', 404)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'conflict', 409)
  }
}

export class InsufficientCreditsError extends AppError {
  constructor(readonly remaining: number) {
    super(
      'You have no AI credits left. Upgrade your plan to keep generating.',
      'insufficient_credits',
      402,
    )
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Try again in a moment.') {
    super(message, 'rate_limited', 429)
  }
}

export function toErrorResponse(error: unknown): {
  status: number
  body: { error: string; code: string; details?: unknown }
} {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: error.message, code: error.code, details: error.details },
    }
  }

  console.error('[unhandled]', error)
  return {
    status: 500,
    body: {
      error: 'Something went wrong on our side. Please try again.',
      code: 'internal_error',
    },
  }
}
