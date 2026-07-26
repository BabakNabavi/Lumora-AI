'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Heart,
  Images,
  LayoutGrid,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import { Avatar } from '@/components/ui/primitives'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/primitives'
import { initials } from '@/lib/utils'

export interface UserMenuUser {
  name: string | null
  email: string
  image: string | null
  credits: number
  role: 'USER' | 'ADMIN'
}

export function UserMenu({ user }: { user: UserMenuUser }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function signOut() {
    setPending(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Signed out')
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Could not sign you out. Try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-full border border-line bg-surface/80 py-1 pl-1 pr-3 text-sm text-ink transition-colors hover:border-line-strong hover:bg-surface"
        aria-label="Account menu"
      >
        <Avatar
          src={user.image}
          fallback={initials(user.name, user.email)}
          className="size-7"
        />
        <span className="hidden max-w-28 truncate text-[0.8125rem] sm:block">
          {user.name ?? user.email}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate text-[0.8125rem] text-ink">
            {user.name ?? 'Your account'}
          </span>
          <span className="mt-0.5 block truncate text-xs text-ink-faint">
            {user.email}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutGrid />
            Overview
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/designs">
            <Images />
            My designs
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/favorites">
            <Heart />
            Favorites
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/credits">
            <Sparkles />
            <span className="flex-1">AI credits</span>
            <span className="tabular-nums text-xs text-ink-faint">
              {user.credits}
            </span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>

        {user.role === 'ADMIN' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <ShieldCheck />
                Admin panel
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          destructive
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault()
            void signOut()
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
