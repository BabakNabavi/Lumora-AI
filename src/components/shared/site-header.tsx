'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, Sparkles, X } from 'lucide-react'

import { Logo } from '@/components/shared/logo'
import { UserMenu, type UserMenuUser } from '@/components/shared/user-menu'
import { Button } from '@/components/ui/button'
import { navigation } from '@/config/site'
import { cn } from '@/lib/utils'

/**
 * Marketing header.
 *
 * Transparent over the hero, then settles onto a hairline-bordered translucent
 * bar once the page scrolls — so the first viewport stays cinematic without
 * losing navigation.
 */
export function SiteHeader({ user }: { user: UserMenuUser | null }) {
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile menu whenever the route changes — including a back
  // navigation, which an onClick handler on the links would miss. Adjusting
  // state during render is React's documented pattern for this.
  const [menuPath, setMenuPath] = React.useState(pathname)
  if (menuPath !== pathname) {
    setMenuPath(pathname)
    setOpen(false)
  }

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-500',
        scrolled || open
          ? 'border-b border-line/80 bg-canvas/85 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <div className="container-studio flex h-header items-center justify-between gap-6">
        <Logo />

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Main navigation"
        >
          {navigation.marketing.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[0.8125rem] text-ink-body transition-colors hover:bg-canvas-deep hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <Button
                asChild
                size="sm"
                variant="accent"
                className="hidden sm:inline-flex"
              >
                <Link href="/studio">
                  <Sparkles />
                  New design
                </Link>
              </Button>
              <UserMenu user={user} />
            </>
          ) : (
            <>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="hidden sm:inline-flex"
              >
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/studio">
                  <span className="hidden sm:inline">Start designing</span>
                  <span className="sm:hidden">Start</span>
                </Link>
              </Button>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-canvas-deep lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-line bg-canvas lg:hidden"
          >
            <nav
              className="container-studio flex flex-col gap-1 py-5"
              aria-label="Mobile navigation"
            >
              {navigation.marketing.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-3 text-[0.9375rem] text-ink-body transition-colors hover:bg-canvas-deep hover:text-ink"
                >
                  {item.label}
                </Link>
              ))}

              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
                {user ? (
                  <>
                    <Button asChild variant="accent">
                      <Link href="/studio">
                        <Sparkles />
                        New design
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/dashboard">Dashboard</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild>
                      <Link href="/studio">Start designing</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/login">Sign in</Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
