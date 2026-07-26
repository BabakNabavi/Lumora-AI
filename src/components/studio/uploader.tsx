'use client'

import * as React from 'react'
import Image from 'next/image'
import { ImageUp, RefreshCw, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { uploadConfig } from '@/config/site'
import { cn, formatBytes } from '@/lib/utils'

export interface UploadedPhoto {
  uploadId: string
  url: string
  width: number
  height: number
  size: number
  name: string
}

/**
 * Step 1 — the room photograph.
 *
 * Validates locally for immediate feedback, then uploads; the server re-checks
 * everything (magic bytes, decode, dimensions) because a client-side check is a
 * courtesy, not a control.
 */
export function Uploader({
  value,
  onChange,
}: {
  value: UploadedPhoto | null
  onChange: (photo: UploadedPhoto | null) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [progress, setProgress] = React.useState<number | null>(null)

  const upload = React.useCallback(
    async (file: File) => {
      if (!uploadConfig.acceptedTypes.includes(file.type as never)) {
        toast.error(`Only ${uploadConfig.acceptLabel} images are supported.`)
        return
      }
      if (file.size > uploadConfig.maxBytes) {
        toast.error(
          `That file is ${formatBytes(file.size)} — the limit is ${uploadConfig.maxLabel}.`,
        )
        return
      }

      setProgress(0)
      const body = new FormData()
      body.append('file', file)

      try {
        // XHR rather than fetch: it reports upload progress, which matters for
        // a 12 MB photo on a phone connection.
        const result = await new Promise<UploadedPhoto>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('POST', '/api/upload')

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              setProgress(Math.round((event.loaded / event.total) * 100))
            }
          })

          xhr.addEventListener('load', () => {
            try {
              const json = JSON.parse(xhr.responseText)
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve({ ...json, name: file.name })
              } else {
                reject(new Error(json.error ?? 'Upload failed.'))
              }
            } catch {
              reject(new Error('Upload failed.'))
            }
          })

          xhr.addEventListener('error', () =>
            reject(new Error('Network error while uploading.')),
          )
          xhr.send(body)
        })

        onChange(result)
        toast.success('Photo uploaded')
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Upload failed.',
        )
      } finally {
        setProgress(null)
      }
    },
    [onChange],
  )

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void upload(file)
  }

  if (value) {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-lg border border-line bg-canvas-deep">
          <Image
            src={value.url}
            alt={value.name}
            width={value.width}
            height={value.height}
            className="max-h-[26rem] w-full object-contain"
            unoptimized
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-charcoal/60 text-white backdrop-blur-sm transition-colors hover:bg-charcoal/80"
            aria-label="Remove photo"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-muted">
          <p className="truncate">
            <span className="text-ink-body">{value.name}</span> ·{' '}
            {value.width}×{value.height} · {formatBytes(value.size)}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <RefreshCw />
            Replace
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={uploadConfig.acceptedTypes.join(',')}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void upload(file)
            event.target.value = ''
          }}
        />
      </div>
    )
  }

  const busy = progress !== null

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={busy}
        className={cn(
          'group relative flex w-full flex-col items-center justify-center gap-5 rounded-lg border-2 border-dashed px-6 py-20 text-center',
          'transition-[border-color,background-color] duration-300',
          dragging
            ? 'border-accent bg-accent-soft/60'
            : 'border-line-strong bg-surface-warm hover:border-ink/25 hover:bg-surface',
          busy && 'pointer-events-none opacity-70',
        )}
      >
        <span
          className={cn(
            'flex size-14 items-center justify-center rounded-full bg-canvas-deep text-ink-muted transition-all duration-500',
            'group-hover:bg-ink group-hover:text-canvas',
            dragging && 'scale-110 bg-accent text-white',
          )}
        >
          <ImageUp className="size-6" aria-hidden />
        </span>

        <span className="space-y-2">
          <span className="block font-display text-lg text-ink">
            {busy ? 'Uploading…' : 'Drop your room photo here'}
          </span>
          <span className="block text-sm text-ink-muted">
            {busy
              ? `${progress}% complete`
              : `or click to browse · ${uploadConfig.acceptLabel} · up to ${uploadConfig.maxLabel}`}
          </span>
        </span>

        {busy && (
          <span className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-lg bg-line-faint">
            <span
              className="block h-full bg-accent transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </span>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={uploadConfig.acceptedTypes.join(',')}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
          event.target.value = ''
        }}
      />

      <p className="mt-4 text-center text-xs text-ink-faint">
        Photos are re-encoded on upload, which strips EXIF metadata including
        any GPS coordinates.
      </p>
    </div>
  )
}
