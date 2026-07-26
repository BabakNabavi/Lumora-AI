import type { Metadata } from 'next'

import { Hero } from '@/components/marketing/hero'
import {
  CtaSection,
  HowItWorks,
  PalettesSection,
  PreviewSection,
  PricingSection,
  RoomsSection,
  StylesSection,
} from '@/components/marketing/sections'
import { ROOMS, STYLES } from '@/config/design-options'
import { siteConfig } from '@/config/site'
import { heroPlates, roomPlate, stylePlate, type Plate } from '@/lib/assets'

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: { canonical: '/' },
}

export default function HomePage() {
  const hero = heroPlates()

  const stylePlates: Record<string, Plate> = Object.fromEntries(
    STYLES.map((style) => [style.id, stylePlate(style.id)]),
  )
  const roomPlates: Record<string, Plate> = Object.fromEntries(
    ROOMS.map((room) => [room.id, roomPlate(room.id)]),
  )

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteConfig.name,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web',
    description: siteConfig.description,
    url: siteConfig.url,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free plan with 5 AI generations',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        // Static, author-controlled structured data.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Hero plate={hero.after} />
      <PreviewSection before={hero.before} after={hero.after} />
      <HowItWorks />
      <StylesSection plates={stylePlates} />
      <RoomsSection plates={roomPlates} />
      <PalettesSection />
      <PricingSection />
      <CtaSection plate={hero.after} />
    </>
  )
}
