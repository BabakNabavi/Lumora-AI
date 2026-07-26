/**
 * generate-assets.mjs
 *
 * Produces every piece of artwork the product ships with — hero plates, style
 * cards, room thumbnails, the inspirations gallery, the guest-demo pair, the
 * Open Graph image — by rendering the perspective scene engine in `lib/scene.mjs`
 * with the material palettes from `src/config/catalog.json`.
 *
 * Output: public/assets/generated/**  + a manifest containing dimensions and
 * base64 blur placeholders so <Image> can fade in from a real LQIP.
 *
 *   npm run assets:generate
 */

import { mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { renderScene, shade, mix } from './lib/scene.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'public', 'assets', 'generated')

const catalog = JSON.parse(
  await readFile(path.join(ROOT, 'src', 'config', 'catalog.json'), 'utf8'),
)

const styleOf = (id) => catalog.styles.find((s) => s.id === id)
const roomOf = (id) => catalog.rooms.find((r) => r.id === id)
const lightOf = (id) => catalog.lighting.find((l) => l.id === id)
const paletteOf = (id) => catalog.palettes.find((p) => p.id === id)

/** Blends a style's render palette toward a colour palette's swatches. */
function applyPalette(render, paletteId) {
  const p = paletteOf(paletteId)
  if (!p) return render
  const t = p.transform ?? {}
  const tint = t.tint ?? '#ffffff'
  // Kept deliberately gentle: the palette should recolour the room, not
  // flatten every material into a single tone.
  const a = Math.min(0.32, (t.tintAlpha ?? 0.1) * 1.5)
  const b = (t.brightness ?? 1) - 1
  const out = {}
  for (const [k, v] of Object.entries(render)) {
    const weight = k === 'accent' ? a * 0.3 : k === 'floor' || k === 'wood' ? a * 0.7 : a
    out[k] = shade(mix(v, tint, weight), b * 0.8)
  }
  return out
}

/**
 * The scene engine composes for a landscape frame, the way a real interior is
 * photographed. Portrait outputs are therefore rendered wide and centre-cropped
 * — a photographic crop — instead of being squeezed into a distorted geometry.
 */
function sceneSvg({ width, height, ...opts }) {
  const srcAspect = Math.max(width / height, 1.25)
  const srcH = height
  const srcW = Math.round(srcH * srcAspect)
  return renderScene({ width: srcW, height: srcH, ...opts })
}

const manifest = {}

async function emit(relPath, svg, { width, height, quality = 88 }) {
  const abs = path.join(OUT, relPath)
  await mkdir(path.dirname(abs), { recursive: true })

  const buf = Buffer.from(svg)
  const pipeline = sharp(buf, { density: 96 }).resize(width, height, {
    fit: 'cover',
  })

  const ext = path.extname(relPath).toLowerCase()
  const out =
    ext === '.png'
      ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
      : await pipeline.webp({ quality, effort: 5 }).toBuffer()

  await writeFile(abs, out)

  const lqip = await sharp(out).resize(16).blur(1.1).webp({ quality: 30 }).toBuffer()

  const key = `/assets/generated/${relPath.split(path.sep).join('/')}`
  manifest[key] = {
    src: key,
    width,
    height,
    blurDataURL: `data:image/webp;base64,${lqip.toString('base64')}`,
  }
  return key
}

/* ── 1. Hero plates (before / after, cinematic 16:9) ──────────────────────── */

async function heroPlates() {
  const style = styleOf('japandi')
  const colors = applyPalette(style.render, 'earthy')
  const light = lightOf('warm').transform

  await emit(
    path.join('hero', 'before.webp'),
    sceneSvg({
      width: 2000,
      height: 1125,
      kind: 'living',
      colors,
      stage: 'before',
      lighting: lightOf('soft').transform,
      seed: 11,
    }),
    { width: 2000, height: 1125, quality: 86 },
  )

  await emit(
    path.join('hero', 'after.webp'),
    sceneSvg({
      width: 2000,
      height: 1125,
      kind: 'living',
      colors,
      stage: 'after',
      lighting: light,
      seed: 11,
    }),
    { width: 2000, height: 1125, quality: 90 },
  )
}

/* ── 2. Guest demo pair (4:3, used by the try-before-signup flow) ─────────── */

async function demoPlates() {
  const style = styleOf('scandinavian')
  const colors = applyPalette(style.render, 'neutral')

  await emit(
    path.join('demo', 'before.webp'),
    sceneSvg({
      width: 1440,
      height: 1080,
      kind: 'bedroom',
      colors,
      stage: 'before',
      lighting: lightOf('soft').transform,
      seed: 23,
    }),
    { width: 1440, height: 1080 },
  )
  await emit(
    path.join('demo', 'after.webp'),
    sceneSvg({
      width: 1440,
      height: 1080,
      kind: 'bedroom',
      colors,
      stage: 'after',
      lighting: lightOf('natural').transform,
      seed: 23,
    }),
    { width: 1440, height: 1080 },
  )
}

/* ── 3. Style cards (4:5 editorial portrait) ──────────────────────────────── */

const STYLE_SCENE = {
  modern: 'living',
  minimal: 'living',
  luxury: 'dining',
  scandinavian: 'bedroom',
  industrial: 'kitchen',
  japandi: 'living',
  classic: 'dining',
  contemporary: 'office',
}

async function styleCards() {
  let i = 0
  for (const style of catalog.styles) {
    await emit(
      path.join('styles', `${style.id}.webp`),
      sceneSvg({
        width: 1000,
        height: 1250,
        kind: STYLE_SCENE[style.id] ?? 'living',
        colors: style.render,
        stage: 'after',
        lighting: lightOf(
          ['luxury', 'industrial'].includes(style.id) ? 'dramatic' : 'natural',
        ).transform,
        seed: 101 + i++ * 17,
      }),
      { width: 1000, height: 1250 },
    )
  }
}

/* ── 4. Room-type thumbnails (4:3) ────────────────────────────────────────── */

const ROOM_STYLE = {
  'living-room': 'japandi',
  bedroom: 'scandinavian',
  kitchen: 'modern',
  'dining-room': 'contemporary',
  office: 'minimal',
  bathroom: 'contemporary',
  outdoor: 'japandi',
}

async function roomThumbs() {
  let i = 0
  for (const room of catalog.rooms) {
    const style = styleOf(ROOM_STYLE[room.id] ?? 'modern')
    await emit(
      path.join('rooms', `${room.id}.webp`),
      sceneSvg({
        width: 960,
        height: 720,
        kind: room.scene.kind,
        colors: applyPalette(style.render, 'neutral'),
        stage: 'after',
        lighting: lightOf('natural').transform,
        seed: 301 + i++ * 29,
      }),
      { width: 960, height: 720, quality: 84 },
    )
  }
}

/* ── 5. Inspirations gallery ──────────────────────────────────────────────── */

export const INSPIRATIONS = [
  { slug: 'quiet-hours', title: 'Quiet Hours', room: 'living-room', style: 'japandi', palette: 'earthy', lighting: 'soft', mood: 'calm' },
  { slug: 'northern-light', title: 'Northern Light', room: 'bedroom', style: 'scandinavian', palette: 'neutral', lighting: 'natural', mood: 'calm' },
  { slug: 'white-line', title: 'White Line', room: 'kitchen', style: 'modern', palette: 'monochrome', lighting: 'natural', mood: 'minimal' },
  { slug: 'long-table', title: 'The Long Table', room: 'dining-room', style: 'luxury', palette: 'warm', lighting: 'dramatic', mood: 'luxury' },
  { slug: 'deep-work', title: 'Deep Work', room: 'office', style: 'minimal', palette: 'neutral', lighting: 'soft', mood: 'minimal' },
  { slug: 'foundry', title: 'Foundry', room: 'living-room', style: 'industrial', palette: 'dark', lighting: 'dramatic', mood: 'bold' },
  { slug: 'still-water', title: 'Still Water', room: 'bathroom', style: 'contemporary', palette: 'monochrome', lighting: 'soft', mood: 'minimal' },
  { slug: 'shade-garden', title: 'Shade Garden', room: 'outdoor', style: 'japandi', palette: 'earthy', lighting: 'warm', mood: 'cozy' },
  { slug: 'evening-room', title: 'Evening Room', room: 'living-room', style: 'luxury', palette: 'dark', lighting: 'dramatic', mood: 'luxury' },
  { slug: 'the-annex', title: 'The Annex', room: 'bedroom', style: 'classic', palette: 'warm', lighting: 'warm', mood: 'cozy' },
  { slug: 'gallery-hours', title: 'Gallery Hours', room: 'dining-room', style: 'contemporary', palette: 'neutral', lighting: 'natural', mood: 'minimal' },
  { slug: 'bakehouse', title: 'Bakehouse', room: 'kitchen', style: 'scandinavian', palette: 'warm', lighting: 'natural', mood: 'cozy' },
]

async function inspirations() {
  let i = 0
  for (const item of INSPIRATIONS) {
    const style = styleOf(item.style)
    const room = roomOf(item.room)
    await emit(
      path.join('inspirations', `${item.slug}.webp`),
      sceneSvg({
        width: 1280,
        height: 960,
        kind: room.scene.kind,
        colors: applyPalette(style.render, item.palette),
        stage: 'after',
        lighting: lightOf(item.lighting).transform,
        seed: 601 + i++ * 37,
      }),
      { width: 1280, height: 960 },
    )
  }
}

/* ── 6. Open Graph card ───────────────────────────────────────────────────── */

async function openGraph() {
  const style = styleOf('japandi')
  const colors = applyPalette(style.render, 'earthy')
  const base = sceneSvg({
    width: 1200,
    height: 630,
    kind: 'living',
    colors,
    stage: 'after',
    lighting: lightOf('warm').transform,
    seed: 11,
  })

  const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <defs>
      <linearGradient id="scrim" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stop-color="#12100E" stop-opacity="0.86"/>
        <stop offset="62%" stop-color="#12100E" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#12100E" stop-opacity="0.18"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#scrim)"/>
    <g transform="translate(84 176)">
      <rect x="0" y="0" width="44" height="44" fill="none" stroke="#E3D8C8" stroke-width="2"/>
      <path d="M 10 34 L 22 12 L 34 34 Z" fill="#C79A6B"/>
    </g>
    <text x="84" y="150" font-family="Georgia, 'Times New Roman', serif" font-size="21" letter-spacing="6" fill="#C9BCA9">AI INTERIOR STUDIO</text>
    <text x="84" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="#FBF8F3">Reimagine Your Space</text>
    <text x="84" y="418" font-family="Georgia, 'Times New Roman', serif" font-size="76" fill="#C79A6B">With AI</text>
    <text x="84" y="492" font-family="Helvetica, Arial, sans-serif" font-size="25" fill="#CFC6B9">Transform your interior into a space that feels uniquely yours.</text>
  </svg>`

  const bg = await sharp(Buffer.from(base)).resize(1200, 630).png().toBuffer()
  const composed = await sharp(bg)
    .composite([{ input: Buffer.from(overlay) }])
    .png({ compressionLevel: 9 })
    .toBuffer()

  await mkdir(OUT, { recursive: true })
  await writeFile(path.join(OUT, 'og.png'), composed)
  manifest['/assets/generated/og.png'] = {
    src: '/assets/generated/og.png',
    width: 1200,
    height: 630,
  }
}

/* ── 7. Texture: paper grain used behind large sections ───────────────────── */

async function textures() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4"/></filter>
    <rect width="600" height="600" filter="url(#n)" opacity="0.5"/>
  </svg>`
  await emit(path.join('textures', 'grain.webp'), svg, {
    width: 600,
    height: 600,
    quality: 60,
  })
}

/* ── run ──────────────────────────────────────────────────────────────────── */

const t0 = Date.now()
await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

await heroPlates()
await demoPlates()
await styleCards()
await roomThumbs()
await inspirations()
await openGraph()
await textures()

await writeFile(
  path.join(OUT, 'manifest.json'),
  JSON.stringify(
    { generatedAt: new Date().toISOString(), inspirations: INSPIRATIONS, assets: manifest },
    null,
    2,
  ),
)

const count = Object.keys(manifest).length
console.log(`✓ generated ${count} assets in ${((Date.now() - t0) / 1000).toFixed(1)}s → public/assets/generated`)
