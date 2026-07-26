export const siteConfig = {
  name: 'AI Interior Studio',
  shortName: 'Interior Studio',
  title: 'AI Interior Studio — Reimagine Your Space With AI',
  description:
    'Upload a photo of your room and let AI reimagine it. Choose a style, palette, lighting and mood, then compare the result side by side with your original space.',
  tagline: 'Reimagine Your Space With AI',
  subtitle: 'Transform your interior into a space that feels uniquely yours.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  locale: 'en_US',
  keywords: [
    'AI interior design',
    'interior design generator',
    'room redesign AI',
    'virtual staging',
    'AI room makeover',
    'interior visualisation',
  ],
  author: { name: 'AI Interior Studio' },
} as const

/** Upload constraints — enforced client-side for UX and server-side for safety. */
export const uploadConfig = {
  maxBytes: 12 * 1024 * 1024,
  maxLabel: '12 MB',
  minDimension: 320,
  maxDimension: 6000,
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  acceptedExtensions: ['.jpg', '.jpeg', '.png', '.webp'] as const,
  acceptLabel: 'JPG, PNG or WEBP',
} as const

/** Guest demo limits — lets a visitor generate before creating an account. */
export const demoConfig = {
  generations: 1,
  cookieName: 'ais_demo',
} as const

export const navigation = {
  marketing: [
    { href: '/#how-it-works', label: 'How it works' },
    { href: '/inspirations', label: 'Inspirations' },
    { href: '/#styles', label: 'Styles' },
    { href: '/#pricing', label: 'Pricing' },
  ],
  dashboard: [
    { href: '/dashboard', label: 'Overview', icon: 'LayoutGrid' },
    { href: '/dashboard/designs', label: 'My Designs', icon: 'Images' },
    { href: '/dashboard/favorites', label: 'Favorites', icon: 'Heart' },
    { href: '/dashboard/credits', label: 'AI Credits', icon: 'Sparkles' },
    { href: '/dashboard/settings', label: 'Settings', icon: 'Settings' },
  ],
  admin: [
    { href: '/admin', label: 'Reports', icon: 'ChartNoAxesCombined' },
    { href: '/admin/users', label: 'Users', icon: 'Users' },
    { href: '/admin/designs', label: 'Designs', icon: 'Images' },
    { href: '/admin/generations', label: 'AI Generations', icon: 'Sparkles' },
  ],
} as const
