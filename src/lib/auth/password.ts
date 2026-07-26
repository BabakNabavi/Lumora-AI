import 'server-only'

import bcrypt from 'bcryptjs'

const ROUNDS = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS)
}

/**
 * Constant-work verification: when a user has no password hash (they signed up
 * with Google), a dummy compare still runs so response timing does not reveal
 * whether the account exists.
 */
const DUMMY_HASH =
  '$2a$12$Q7iZ0lJ0M0Z1zVQ0oW7gEeKZ2rN6nB1vF9lS8pC0aD3xY5uH4tG6y'

export async function verifyPassword(
  plain: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, DUMMY_HASH)
    return false
  }
  return bcrypt.compare(plain, hash)
}
