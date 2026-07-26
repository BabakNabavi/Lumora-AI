import type { DesignStatus } from '@prisma/client'

import type { DesignInsight } from '@/lib/ai/types'

/**
 * The shape every UI surface consumes. Storage keys are already resolved to
 * URLs and catalog ids already resolved to labels, so no component ever needs
 * the storage driver or the catalog to render a design.
 */
export interface DesignView {
  id: string
  title: string

  roomType: string
  style: string
  palette: string
  lighting: string
  mood: string

  labels: {
    room: string
    style: string
    palette: string
    lighting: string
    mood: string
  }

  paletteSwatches: string[]

  originalUrl: string
  resultUrl: string | null

  width: number | null
  height: number | null

  status: DesignStatus
  description: string | null
  insights: DesignInsight[]

  isFavorite: boolean
  shareId: string | null

  createdAt: string
  updatedAt: string
}

export interface DesignListResult {
  items: DesignView[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}
