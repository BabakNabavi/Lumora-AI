import Link from 'next/link'

import { LogoMark } from '@/components/shared/logo'
import { STYLES } from '@/config/design-options'
import { siteConfig } from '@/config/site'

/**
 * Instagram glyph. Drawn here rather than imported: lucide-react dropped brand
 * marks, and hand-rolling it keeps the 1.6px stroke weight consistent with
 * every other icon in the interface.
 */
function InstagramMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.1" cy="6.9" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

const columns = [
  {
    title: 'Product',
    links: [
      { href: '/studio', label: 'Studio' },
      { href: '/inspirations', label: 'Inspirations' },
      { href: '/#how-it-works', label: 'How it works' },
      { href: '/#pricing', label: 'Pricing' },
    ],
  },
  {
    title: 'Account',
    links: [
      { href: '/login', label: 'Sign in' },
      { href: '/signup', label: 'Create account' },
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/dashboard/credits', label: 'AI credits' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-canvas-deep/60">
      <div className="container-studio py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <div className="flex items-center gap-2.5 text-ink">
              <LogoMark className="size-7" />
              <span className="font-display text-[0.9375rem]">
                {siteConfig.name}
              </span>
            </div>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ink-muted">
              {siteConfig.subtitle} Upload a photograph, choose a direction, and
              see the room again.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="eyebrow">{column.title}</p>
              <ul className="mt-5 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-ink-muted transition-colors hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="eyebrow">Styles</p>
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-3">
              {STYLES.map((style) => (
                <li key={style.id}>
                  <Link
                    href={`/inspirations?style=${style.id}`}
                    className="text-sm text-ink-muted transition-colors hover:text-ink"
                  >
                    {style.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-line pt-8 text-xs text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
            <span>
              © {new Date().getFullYear()} {siteConfig.name}.
            </span>
            <span className="flex items-center gap-2.5">
              <span>
                Developed by{' '}
                <a
                  href="https://www.babaknabavi.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
                >
                  Babak Nabavi
                </a>
              </span>
              <a
                href="https://www.instagram.com/babaknabavi"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Babak Nabavi on Instagram"
                className="group inline-flex size-7 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-[color,border-color,background-color,transform] duration-300 ease-[var(--ease-out-quint)] hover:-translate-y-px hover:border-ink hover:bg-ink hover:text-canvas"
              >
                <InstagramMark className="size-3.5" />
              </a>
            </span>
          </p>
          <p>
            Renders are produced by the configured AI provider and are
            illustrative, not construction documents.
          </p>
        </div>
      </div>
    </footer>
  )
}
