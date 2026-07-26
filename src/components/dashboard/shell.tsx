'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChartNoAxesCombined,
  Heart,
  Images,
  LayoutGrid,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react'

import { Logo } from '@/components/shared/logo'
import { UserMenu, type UserMenuUser } from '@/components/shared/user-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ICONS = {
  LayoutGrid,
  Images,
  Heart,
  Sparkles,
  Settings,
  Users,
  ChartNoAxesCombined,
} as const

export interface NavItem {
  href: string
  label: string
  icon: keyof typeof ICONS
}

/**
 * Product shell.
 *
 * A rail on desktop, a scrollable tab strip on mobile — the same navigation
 * reorganised for the viewport rather than a desktop sidebar collapsed into a
 * hamburger, which hides the product's structure on the device most people
 * browse designs on.
 */
export function DashboardShell({
  user,
  items,
  title,
  children,
}: {
  user: UserMenuUser
  items: readonly NavItem[]
  title: string
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href ||
    (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(`${href}/`))

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/88 backdrop-blur-xl">
        <div className="container-studio flex h-header items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Logo />
            <span
              className="hidden h-5 w-px bg-line lg:block"
              aria-hidden
            />
            <span className="hidden text-sm text-ink-muted lg:block">
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button asChild size="sm" variant="accent">
              <Link href="/studio">
                <Sparkles />
                <span className="hidden sm:inline">New design</span>
                <span className="sm:hidden">New</span>
              </Link>
            </Button>
            <UserMenu user={user} />
          </div>
        </div>

        {/* Mobile / tablet nav */}
        <nav
          className="container-studio flex gap-1 overflow-x-auto border-t border-line py-2 lg:hidden"
          aria-label="Section navigation"
        >
          {items.map((item) => {
            const Icon = ICONS[item.icon]
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[0.8125rem] transition-colors',
                  isActive(item.href)
                    ? 'bg-ink text-canvas'
                    : 'text-ink-muted hover:bg-canvas-deep hover:text-ink',
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <div className="container-studio flex gap-12 py-10 lg:py-14">
        <aside className="hidden w-52 shrink-0 lg:block">
          <nav className="sticky top-28 space-y-0.5" aria-label="Section navigation">
            {items.map((item) => {
              const Icon = ICONS[item.icon]
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-[0.875rem] transition-colors',
                    active
                      ? 'bg-surface text-ink shadow-soft'
                      : 'text-ink-muted hover:bg-canvas-deep hover:text-ink',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      active ? 'text-accent' : 'text-ink-faint',
                    )}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main id="main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}

/** Page header used inside the shell. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <header className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl leading-tight sm:text-[2.125rem]">{title}</h1>
        {description && (
          <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2.5">{actions}</div>}
    </header>
  )
}
