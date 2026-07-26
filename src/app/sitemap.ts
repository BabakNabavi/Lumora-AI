import type { MetadataRoute } from 'next'

import { STYLES } from '@/config/design-options'
import { siteConfig } from '@/config/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/+$/, '')
  const now = new Date()

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${base}/studio`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${base}/inspirations`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...STYLES.map((style) => ({
      url: `${base}/inspirations?style=${style.id}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}
