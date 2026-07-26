import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium tracking-[-0.005em] select-none',
    'transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-[var(--ease-out-quint)]',
    'disabled:pointer-events-none disabled:opacity-45',
    'active:translate-y-px',
    '[&_svg]:shrink-0 [&_svg]:size-[1.05em]',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-ink text-canvas shadow-soft hover:bg-[#2a2724] hover:shadow-lift',
        accent:
          'bg-accent text-white shadow-soft hover:bg-accent-hover hover:shadow-lift',
        outline:
          'border border-line-strong bg-surface/70 text-ink backdrop-blur-sm hover:border-ink/25 hover:bg-surface',
        subtle:
          'bg-canvas-deep text-ink-body hover:bg-line-faint hover:text-ink',
        ghost: 'text-ink-body hover:bg-canvas-deep hover:text-ink',
        link: 'text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink',
        danger:
          'bg-danger-soft text-danger hover:bg-danger hover:text-white',
      },
      size: {
        sm: 'h-9 rounded-full px-4 text-[0.8125rem]',
        md: 'h-11 rounded-full px-6 text-sm',
        lg: 'h-13 rounded-full px-8 text-[0.9375rem]',
        icon: 'size-10 rounded-full',
        'icon-sm': 'size-8 rounded-full',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild, loading, children, disabled, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
