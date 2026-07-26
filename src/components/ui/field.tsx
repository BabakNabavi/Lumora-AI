'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'

import { cn } from '@/lib/utils'

export const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-[0.8125rem] font-medium text-ink-body peer-disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Label.displayName = 'Label'

const fieldBase = [
  'w-full rounded-md border border-line-strong bg-surface px-3.5 text-sm text-ink',
  'placeholder:text-ink-faint',
  'transition-[border-color,box-shadow] duration-200',
  'hover:border-ink/20',
  'focus:border-accent-ring focus:outline-none focus:ring-4 focus:ring-accent-soft',
  'disabled:cursor-not-allowed disabled:bg-canvas-deep disabled:opacity-60',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:ring-danger-soft',
]

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(fieldBase, 'h-11', className)} {...props} />
))
Input.displayName = 'Input'

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(fieldBase, 'min-h-24 resize-y py-3', className)}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

/** Label + control + error message, wired up for assistive tech. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor: string
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  const errorId = `${htmlFor}-error`
  const hintId = `${htmlFor}-hint`

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {React.isValidElement(children)
        ? React.cloneElement(
            children as React.ReactElement<Record<string, unknown>>,
            {
              id: htmlFor,
              'aria-invalid': error ? true : undefined,
              'aria-describedby':
                [error && errorId, hint && hintId].filter(Boolean).join(' ') ||
                undefined,
            },
          )
        : children}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-faint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
