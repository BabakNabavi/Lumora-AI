import type { MetadataRoute } from 'next'

import { siteConfig } from '@/config/site'

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/+$/, '')

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private surfaces and unlisted share links stay out of the index.
      disallow: ['/api/', '/dashboard', '/admin', '/designs', '/s/'],
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
