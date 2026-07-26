/**
 * preview-grades.mts — renders one source photograph through several briefs and
 * tiles the results, so the offline provider's output can be eyeballed.
 *
 *   npx tsx scripts/preview-grades.mts
 */

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

import { MockAIProvider } from '../src/lib/ai/providers/mock'
import type { DesignBrief } from '../src/lib/ai/types'

process.env.MOCK_MIN_DURATION_MS = '0'

const BRIEFS: (DesignBrief & { label: string })[] = [
  { label: 'luxury/dark/dramatic', roomType: 'living-room', style: 'luxury', palette: 'dark', lighting: 'dramatic', mood: 'luxury' },
  { label: 'scandi/neutral/natural', roomType: 'living-room', style: 'scandinavian', palette: 'neutral', lighting: 'natural', mood: 'calm' },
  { label: 'industrial/mono/dramatic', roomType: 'living-room', style: 'industrial', palette: 'monochrome', lighting: 'dramatic', mood: 'bold' },
  { label: 'japandi/earthy/warm', roomType: 'living-room', style: 'japandi', palette: 'earthy', lighting: 'warm', mood: 'cozy' },
  { label: 'minimal/mono/soft', roomType: 'living-room', style: 'minimal', palette: 'monochrome', lighting: 'soft', mood: 'minimal' },
  { label: 'classic/warm/warm', roomType: 'living-room', style: 'classic', palette: 'warm', lighting: 'warm', mood: 'cozy' },
]

const source = await readFile(
  path.join(process.cwd(), 'public', 'assets', 'generated', 'inspirations', 'quiet-hours.webp'),
)

const provider = new MockAIProvider()
const CELL_W = 460
const CELL_H = 259

const tiles: sharp.OverlayOptions[] = []

const original = await sharp(source).resize(CELL_W, CELL_H).png().toBuffer()
tiles.push({ input: original, left: 0, top: 0 })

for (const [index, brief] of BRIEFS.entries()) {
  const result = await provider.generate({
    image: { body: source, contentType: 'image/webp' },
    brief,
  })
  const tile = await sharp(result.image.body).resize(CELL_W, CELL_H).png().toBuffer()
  const slot = index + 1
  tiles.push({
    input: tile,
    left: (slot % 3) * CELL_W,
    top: Math.floor(slot / 3) * CELL_H,
  })
  console.log(`· ${brief.label.padEnd(28)} ${result.description.slice(0, 72)}…`)
}

const sheet = await sharp({
  create: {
    width: CELL_W * 3,
    height: CELL_H * 3,
    channels: 3,
    background: '#111111',
  },
})
  .composite(tiles)
  .png()
  .toBuffer()

const out = path.join(process.cwd(), 'scripts', 'grade-preview.png')
await writeFile(out, sheet)
console.log(`\n✓ ${out} — top-left is the untouched source`)
