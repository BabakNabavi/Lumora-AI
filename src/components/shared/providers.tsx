'use client'

import * as React from 'react'
import { Toaster } from 'sonner'

import { TooltipProvider } from '@/components/ui/primitives'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={280} skipDelayDuration={400}>
      {children}
      <Toaster
        position="bottom-right"
        offset={20}
        gap={10}
        toastOptions={{
          duration: 4200,
          classNames: {
            toast:
              'group !rounded-lg !border !border-line !bg-surface !shadow-float !font-sans',
            title: '!text-[0.8125rem] !font-medium !text-ink',
            description: '!text-xs !text-ink-muted',
            actionButton: '!bg-ink !text-canvas !rounded-full !text-xs',
            cancelButton: '!bg-canvas-deep !text-ink-body !rounded-full !text-xs',
            success: '[&_[data-icon]]:!text-success',
            error: '[&_[data-icon]]:!text-danger',
          },
        }}
      />
    </TooltipProvider>
  )
}
