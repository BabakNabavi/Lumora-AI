'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Check,
  Copy,
  CopyPlus,
  Download,
  Heart,
  Link2,
  Loader2,
  RefreshCw,
  Share2,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/primitives'
import { Input } from '@/components/ui/field'
import type { DesignView } from '@/types/design'
import { cn } from '@/lib/utils'

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error ?? 'Something went wrong.')
  return json as T
}

/* ═══ Favourite ════════════════════════════════════════════════════════════ */

export function FavoriteButton({
  design,
  variant = 'outline',
  showLabel = true,
}: {
  design: DesignView
  variant?: 'outline' | 'ghost'
  showLabel?: boolean
}) {
  const router = useRouter()
  const [favorite, setFavorite] = React.useState(design.isFavorite)
  const [pending, setPending] = React.useState(false)

  async function toggle() {
    const next = !favorite
    setFavorite(next) // optimistic
    setPending(true)
    try {
      const result = await api<{ isFavorite: boolean }>(
        `/api/designs/${design.id}/favorite`,
        { method: 'POST' },
      )
      setFavorite(result.isFavorite)
      toast.success(result.isFavorite ? 'Saved to favorites' : 'Removed from favorites')
      router.refresh()
    } catch (error) {
      setFavorite(!next)
      toast.error(error instanceof Error ? error.message : 'Could not update.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      variant={variant}
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorite}
      size={showLabel ? 'md' : 'icon'}
    >
      <Heart className={cn(favorite && 'fill-accent text-accent')} />
      {showLabel && (favorite ? 'Saved' : 'Save design')}
    </Button>
  )
}

/* ═══ Download ═════════════════════════════════════════════════════════════ */

export function DownloadButton({
  design,
  variant = 'outline',
}: {
  design: DesignView
  variant?: 'outline' | 'ghost' | 'primary'
}) {
  return (
    <Button asChild variant={variant}>
      <a href={`/api/designs/${design.id}/download`} download>
        <Download />
        Download
      </a>
    </Button>
  )
}

/* ═══ Share ════════════════════════════════════════════════════════════════ */

export function ShareButton({ design }: { design: DesignView }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [url, setUrl] = React.useState<string | null>(
    design.shareId
      ? `${typeof window === 'undefined' ? '' : window.location.origin}/s/${design.shareId}`
      : null,
  )
  const [pending, setPending] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  async function createLink() {
    setPending(true)
    try {
      const result = await api<{ url: string }>(
        `/api/designs/${design.id}/share`,
        { method: 'POST' },
      )
      setUrl(result.url)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create a link.')
    } finally {
      setPending(false)
    }
  }

  async function revoke() {
    setPending(true)
    try {
      await api(`/api/designs/${design.id}/share`, { method: 'DELETE' })
      setUrl(null)
      toast.success('Link revoked')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not revoke.')
    } finally {
      setPending(false)
    }
  }

  async function copy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy — select the link and copy it manually.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 />
          Share
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Share this design</DialogTitle>
        <DialogDescription>
          A share link lets anyone with the URL view this design — the before
          and after, the brief and the notes. It does not give access to your
          account or your other designs.
        </DialogDescription>

        <div className="mt-6">
          {url ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input readOnly value={url} onFocus={(e) => e.target.select()} />
                <Button onClick={copy} variant="outline" className="shrink-0">
                  {copied ? <Check /> : <Copy />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <button
                type="button"
                onClick={revoke}
                disabled={pending}
                className="text-xs text-ink-muted underline underline-offset-4 transition-colors hover:text-danger"
              >
                Revoke this link
              </button>
            </div>
          ) : (
            <Button onClick={createLink} loading={pending} className="w-full">
              <Link2 />
              Create share link
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ═══ Regenerate ═══════════════════════════════════════════════════════════ */

export function RegenerateButton({
  design,
  label = 'Generate another version',
  variant = 'primary',
}: {
  design: DesignView
  label?: string
  variant?: 'primary' | 'outline' | 'accent'
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function run() {
    setPending(true)
    const toastId = toast.loading('Generating another version…')
    try {
      const result = await api<{ design: DesignView }>(
        `/api/designs/${design.id}/regenerate`,
        { method: 'POST', body: JSON.stringify({}) },
      )
      toast.success('New version ready', { id: toastId })
      router.push(`/designs/${result.design.id}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Generation failed.',
        { id: toastId },
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Button onClick={run} disabled={pending} variant={variant}>
      {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {label}
    </Button>
  )
}

/* ═══ Duplicate ════════════════════════════════════════════════════════════ */

export function DuplicateButton({ design }: { design: DesignView }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function run() {
    setPending(true)
    try {
      const result = await api<{ design: DesignView }>(
        `/api/designs/${design.id}/duplicate`,
        { method: 'POST' },
      )
      toast.success('Duplicated — no credit used')
      router.push(`/designs/${result.design.id}`)
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not duplicate.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Button variant="outline" onClick={run} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <CopyPlus />}
      Duplicate
    </Button>
  )
}

/* ═══ Delete ═══════════════════════════════════════════════════════════════ */

export function DeleteDesignButton({ design }: { design: DesignView }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  async function remove() {
    setPending(true)
    try {
      await api(`/api/designs/${design.id}`, { method: 'DELETE' })
      toast.success('Design deleted')
      setOpen(false)
      router.push('/dashboard/designs')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-danger hover:bg-danger-soft">
          <Trash2 />
          Delete
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogTitle>Delete “{design.title}”?</DialogTitle>
        <DialogDescription>
          This removes the design and both images permanently. The credit spent
          on it is not returned.
        </DialogDescription>

        <div className="mt-7 flex justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">Keep it</Button>
          </DialogClose>
          <Button variant="danger" onClick={remove} loading={pending}>
            Delete design
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
