import { NextResponse, type NextRequest } from 'next/server'

import { SESSION_COOKIE, verifySession } from '@/lib/auth/session'

/**
 * Edge gatekeeping only (Next.js 16 `proxy` convention).
 *
 * Middleware decides *where a request goes*, never what it is allowed to see —
 * every protected page and route handler re-checks identity against the
 * database. Keeping it to a signature check means no database round trip on
 * the hot path.
 */

const PROTECTED = ['/dashboard', '/admin', '/designs']
const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password']

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
  )

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p))

  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/admin') && session?.role !== 'ADMIN') {
    const url = request.nextUrl.clone()
    url.pathname = session ? '/dashboard' : '/login'
    url.search = session ? '' : `?next=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(url)
  }

  if (isAuthPage && session) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, the file proxy and static assets —
     * matching those would add a JWT verification to every image request.
     */
    '/((?!_next/static|_next/image|api/files|assets|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
}
