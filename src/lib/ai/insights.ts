import {
  getLighting,
  getMood,
  getPalette,
  getRoom,
  getStyle,
  labelFor,
} from '@/config/design-options'

import type { DesignBrief, DesignInsight } from './types'

/**
 * Design-insight engine.
 *
 * Providers that return their own vision-model commentary (OpenAI) use it
 * directly. Providers that only return pixels (Replicate, the mock renderer)
 * fall back to this: a deterministic writer that composes commentary from the
 * catalog's own vocabulary, so the copy always describes the exact combination
 * the user chose rather than reading as generic filler.
 */

function picker(seed: number) {
  let s = (seed >>> 0) || 1
  return <T>(items: readonly T[]): T => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0
    return items[s % items.length]
  }
}

function seedFrom(brief: DesignBrief, seed: number): number {
  const key = `${brief.roomType}|${brief.style}|${brief.palette}|${brief.lighting}|${brief.mood}|${seed}`
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const LIGHT_EFFECT: Record<string, string> = {
  natural:
    'daylight is left to do the work, so surfaces read at their true value through the day',
  warm: 'the light sits low and warm, pulling the timber and textile tones forward after dark',
  dramatic:
    'light is directional and deliberately uneven, letting the darker corners hold the room together',
  soft: 'light arrives diffused, flattening shadows so the materials read as texture rather than contrast',
}

const PALETTE_EFFECT: Record<string, string> = {
  warm: 'amber and terracotta undertones',
  neutral: 'greige and bone tones',
  dark: 'charcoal and graphite values',
  earthy: 'clay, olive and unbleached stone',
  monochrome: 'a single hue carried across many values',
}

const ROOM_FOCUS: Record<string, string> = {
  'living-room': 'the seating group',
  bedroom: 'the bed and its headboard wall',
  kitchen: 'the island and the run behind it',
  'dining-room': 'the table and the light above it',
  office: 'the working surface',
  bathroom: 'the vanity and mirror wall',
  outdoor: 'the shaded lounge zone',
}

export function buildDescription(brief: DesignBrief, seed = 0): string {
  const pick = picker(seedFrom(brief, seed))
  const style = getStyle(brief.style)
  const mood = getMood(brief.mood)
  const room = labelFor('room', brief.roomType).toLowerCase()

  const adjective = pick(mood?.adjectives ?? ['considered'])
  const opening = pick([
    `Your ${room} has been reworked as a ${style?.name.toLowerCase()} interior`,
    `This ${room} now reads as a ${style?.name.toLowerCase()} space`,
    `The ${room} has been rebuilt around a ${style?.name.toLowerCase()} language`,
  ])

  const closing = pick([
    `The result is ${adjective} without being cold — the room still belongs to the building it sits in.`,
    `The effect is ${adjective}: nothing competes for attention, and the architecture stays legible.`,
    `Everything is tuned toward a ${adjective} outcome, with the original proportions left intact.`,
  ])

  return [
    `${opening}, built on ${PALETTE_EFFECT[brief.palette] ?? 'a restrained palette'}.`,
    `Here ${LIGHT_EFFECT[brief.lighting] ?? 'the lighting is balanced across the room'}.`,
    closing,
  ].join(' ')
}

export function buildInsights(brief: DesignBrief, seed = 0): DesignInsight[] {
  const pick = picker(seedFrom(brief, seed) ^ 0x5bf03635)
  const style = getStyle(brief.style)
  const palette = getPalette(brief.palette)
  const lighting = getLighting(brief.lighting)
  const mood = getMood(brief.mood)
  const room = getRoom(brief.roomType)

  const focus = ROOM_FOCUS[brief.roomType] ?? 'the main furniture group'
  const keywords = style?.keywords ?? []

  const insights: DesignInsight[] = [
    {
      title: 'Material strategy',
      body: `${style?.name} leans on ${keywords.slice(0, 2).join(' and ') || 'honest, low-contrast materials'}. Those finishes are concentrated around ${focus} so the rest of the room can stay quiet, which is what keeps the scheme from feeling styled.`,
    },
    {
      title: 'Colour behaviour',
      body: `The ${palette?.name.toLowerCase()} palette works through ${PALETTE_EFFECT[brief.palette] ?? 'a narrow tonal range'}. ${pick([
        'Holding the walls one step lighter than the floor gives the room a base to sit on.',
        'Keeping the value range narrow means the eye reads texture before it reads colour.',
        'A single darker accent per surface plane stops the scheme flattening out.',
      ])}`,
    },
    {
      title: 'Light and time of day',
      body: `${lighting?.name} lighting means ${LIGHT_EFFECT[brief.lighting] ?? 'even illumination across the plan'}. ${pick([
        'Layering one ambient source with one task source will hold this at night.',
        'A dimmable circuit is worth the extra work here — the scheme changes character below 40%.',
        'Placing the warmest source lowest in the room is what makes the effect read as intentional.',
      ])}`,
    },
    {
      title: 'Why it feels this way',
      body: `A ${mood?.name.toLowerCase()} result comes from restraint rather than addition: ${mood?.description.toLowerCase()} ${room ? `For a ${room.name.toLowerCase()}, ${room.description.toLowerCase()}` : ''}`.trim(),
    },
  ]

  // Rotate which insight leads so repeat generations don't read identically.
  const offset = seedFrom(brief, seed) % insights.length
  return [...insights.slice(offset), ...insights.slice(0, offset)]
}
