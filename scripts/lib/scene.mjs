/**
 * scene.mjs — a one-point-perspective interior renderer that emits SVG.
 *
 * Everything the studio ships as artwork (hero plates, style cards, room
 * thumbnails, the inspirations gallery, the guest-demo pair, the OG card) is
 * produced here from the same design catalog the product itself reads. No stock
 * photography, no grey placeholder boxes — each frame is a deterministic render
 * of a real room geometry with the requested style's material palette applied.
 *
 * Geometry notes
 *   · The room is a box: an inset back wall plus four trapezoids.
 *   · `u` is lateral position in half-back-wall units, `d` is depth (0 = back
 *     wall, 1 = camera). Objects scale by `depthScale(d)`.
 *   · The back wall is sized from the frame so the render composes correctly at
 *     any aspect ratio — 16:9 hero plates and 4:5 cards share one engine.
 */

/* ── colour utilities ─────────────────────────────────────────────────────── */

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n))
const f = (n) => Number(n).toFixed(1)

export function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

export function rgbToHex({ r, g, b }) {
  const to = (n) =>
    Math.round(clamp(n, 0, 255))
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function mix(a, b, t) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return rgbToHex({
    r: A.r + (B.r - A.r) * t,
    g: A.g + (B.g - A.g) * t,
    b: A.b + (B.b - A.b) * t,
  })
}

/** amount > 0 lightens toward white, < 0 darkens toward black. */
export function shade(hex, amount) {
  return amount >= 0 ? mix(hex, '#ffffff', amount) : mix(hex, '#000000', -amount)
}

export function desaturate(hex, t) {
  const { r, g, b } = hexToRgb(hex)
  const l = 0.299 * r + 0.587 * g + 0.114 * b
  return rgbToHex({ r: r + (l - r) * t, g: g + (l - g) * t, b: b + (l - b) * t })
}

/* ── deterministic randomness ─────────────────────────────────────────────── */

export function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ── geometry ─────────────────────────────────────────────────────────────── */

const SPREAD = 1.42 // how fast the room opens toward the camera
const ROOM_RATIO = 0.58 // back wall height ÷ width

function makeRoom(W, H) {
  // Sized from both axes so the composition survives 16:9 and 4:5 alike:
  // wide frames get a wide wall, tall frames get a larger wall so the ceiling
  // and floor bands stay in proportion.
  const wallW = Math.max(W * 0.56, (H * 0.44) / ROOM_RATIO)
  const wallH = wallW * ROOM_RATIO
  const y2 = H * 0.72
  const y1 = y2 - wallH
  const cx = W / 2
  const halfW = wallW / 2
  const bw = { x1: cx - halfW, y1, x2: cx + halfW, y2 }
  const floorDepth = H - y2

  const floorPoint = (u, d) => ({
    x: cx + u * halfW * (1 + d * SPREAD),
    y: y2 + floorDepth * Math.pow(clamp(d, 0, 1.4), 0.84),
  })
  const depthScale = (d) => 1 + d * SPREAD
  const unit = (d) => wallH * depthScale(d)

  return { W, H, bw, cx, halfW, wallH, floorDepth, floorPoint, depthScale, unit }
}

const pts = (arr) => arr.map(([x, y]) => `${f(x)},${f(y)}`).join(' ')

/* ── primitives ───────────────────────────────────────────────────────────── */

/**
 * A rectangular volume resting on the floor. `d` is the depth of its FRONT
 * face; `depth` is how far it extends back. Widths/heights are in back-wall
 * units (1.0 width = full back wall, 1.0 height = full wall height).
 */
function volume(room, { u, d, w, h, depth = 0.12, front, top, side }) {
  const dB = Math.max(0, d - depth)
  const fp = room.floorPoint(u, d)
  const bp = room.floorPoint(u, dB)
  const fH = (w * room.halfW * room.depthScale(d)) / 2
  const bH = (w * room.halfW * room.depthScale(dB)) / 2
  const fT = fp.y - room.unit(d) * h
  const bT = bp.y - room.unit(dB) * h

  const fl = [fp.x - fH, fp.y]
  const fr = [fp.x + fH, fp.y]
  const ftl = [fp.x - fH, fT]
  const ftr = [fp.x + fH, fT]
  const btl = [bp.x - bH, bT]
  const btr = [bp.x + bH, bT]
  const bl = [bp.x - bH, bp.y]
  const br = [bp.x + bH, bp.y]

  // Only the side facing away from the frame centre is visible.
  const sidePoly =
    u >= 0
      ? `<polygon points="${pts([btr, ftr, fr, br])}" fill="${side}"/>`
      : `<polygon points="${pts([btl, ftl, fl, bl])}" fill="${side}"/>`

  return `<polygon points="${pts([btl, btr, ftr, ftl])}" fill="${top}"/>${sidePoly}<polygon points="${pts([ftl, ftr, fr, fl])}" fill="${front}"/>`
}

/** Soft elliptical contact shadow. */
function shadow(room, { u, d, w, opacity = 0.18 }) {
  const rx = (w * room.halfW * room.depthScale(d)) / 1.55
  const p = room.floorPoint(u, d)
  return `<ellipse cx="${f(p.x)}" cy="${f(p.y)}" rx="${f(rx)}" ry="${f(rx * 0.15)}" fill="url(#contact)" opacity="${opacity}"/>`
}

/**
 * A table: thin top slab on four legs. Drawing legs instead of a solid box is
 * what stops furniture reading as a monolithic slab.
 */
function tableTop(room, { u, d, w, depth = 0.2, h, top, edge, leg }) {
  const dF = d
  const dB = Math.max(0.02, d - depth)
  const fp = room.floorPoint(u, dF)
  const bp = room.floorPoint(u, dB)
  const fH = (w * room.halfW * room.depthScale(dF)) / 2
  const bH = (w * room.halfW * room.depthScale(dB)) / 2
  const fy = fp.y - room.unit(dF) * h
  const by = bp.y - room.unit(dB) * h
  const th = room.unit(dF) * 0.022

  const legW = room.halfW * 0.018
  const legs = [
    [fp.x - fH * 0.9, fp.y, fy, room.depthScale(dF)],
    [fp.x + fH * 0.9, fp.y, fy, room.depthScale(dF)],
    [bp.x - bH * 0.9, bp.y, by, room.depthScale(dB)],
    [bp.x + bH * 0.9, bp.y, by, room.depthScale(dB)],
  ]
    .map(
      ([x, gy, ty, s]) =>
        `<rect x="${f(x - (legW * s) / 2)}" y="${f(ty)}" width="${f(legW * s)}" height="${f(gy - ty)}" fill="${leg}"/>`,
    )
    .join('')

  return `${legs}
    <polygon points="${pts([[bp.x - bH, by], [bp.x + bH, by], [fp.x + fH, fy], [fp.x - fH, fy]])}" fill="${top}"/>
    <polygon points="${pts([[fp.x - fH, fy], [fp.x + fH, fy], [fp.x + fH, fy + th], [fp.x - fH, fy + th]])}" fill="${edge}"/>`
}

/** A chair: seat pad, back panel, four legs. */
function chair(room, { u, d, scale = 1, seat, back, leg }) {
  const w = 0.19 * scale
  const seatH = 0.115
  const backH = 0.26
  const fp = room.floorPoint(u, d)
  const hW = (w * room.halfW * room.depthScale(d)) / 2
  const sy = fp.y - room.unit(d) * seatH
  const legW = room.halfW * 0.016 * room.depthScale(d)
  const legs = [-0.82, 0.82]
    .map(
      (k) =>
        `<rect x="${f(fp.x + hW * k - legW / 2)}" y="${f(sy)}" width="${f(legW)}" height="${f(fp.y - sy)}" fill="${leg}"/>`,
    )
    .join('')
  return `${shadow(room, { u, d, w, opacity: 0.13 })}${legs}
    ${volume(room, { u, d, w, h: seatH + 0.035, depth: 0.055, front: seat, top: shade(seat, 0.16), side: shade(seat, -0.12) })}
    ${volume(room, { u, d: Math.max(0.02, d - 0.05), w: w * 0.94, h: backH, depth: 0.018, front: back, top: shade(back, 0.12), side: shade(back, -0.14) })}`
}

function plant(room, { u, d, scale = 1, pot, leaf }) {
  const s = room.depthScale(d) * scale
  const p = room.floorPoint(u, d)
  const potW = room.halfW * 0.062 * s
  const potH = potW * 1.15
  const stem = potH * 2.9
  const r = rng(Math.round(Math.abs(u) * 977 + d * 613) + 3)
  let leaves = ''
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i - 3.5) * 0.36 + (r() - 0.5) * 0.16
    const len = stem * (0.55 + r() * 0.42)
    const ox = p.x
    const oy = p.y - potH - stem * 0.1
    const ex = ox + Math.cos(a) * len
    const ey = oy + Math.sin(a) * len
    leaves += `<path d="M ${f(ox)} ${f(oy)} Q ${f((ox + ex) / 2 + Math.cos(a + 1.4) * len * 0.34)} ${f((oy + ey) / 2)} ${f(ex)} ${f(ey)}" stroke="${i % 2 ? leaf : shade(leaf, -0.14)}" stroke-width="${f(potW * 0.24)}" stroke-linecap="round" fill="none"/>`
  }
  return `${shadow(room, { u, d, w: 0.07 * scale, opacity: 0.13 })}${leaves}
    <path d="M ${f(p.x - potW)} ${f(p.y - potH)} L ${f(p.x + potW)} ${f(p.y - potH)} L ${f(p.x + potW * 0.72)} ${f(p.y)} L ${f(p.x - potW * 0.72)} ${f(p.y)} Z" fill="${pot}"/>
    <ellipse cx="${f(p.x)}" cy="${f(p.y - potH)}" rx="${f(potW)}" ry="${f(potW * 0.18)}" fill="${shade(pot, 0.16)}"/>`
}

function floorLamp(room, c, { u, d }) {
  const p = room.floorPoint(u, d)
  const s = room.depthScale(d)
  const h = room.unit(d) * 0.58
  const shW = room.halfW * 0.11 * s
  return `${shadow(room, { u, d, w: 0.08, opacity: 0.1 })}
    <rect x="${f(p.x - room.halfW * 0.006 * s)}" y="${f(p.y - h)}" width="${f(room.halfW * 0.012 * s)}" height="${f(h)}" fill="${c.metal}"/>
    <path d="M ${f(p.x - shW * 0.6)} ${f(p.y - h)} L ${f(p.x + shW * 0.6)} ${f(p.y - h)} L ${f(p.x + shW * 0.42)} ${f(p.y - h - shW * 0.82)} L ${f(p.x - shW * 0.42)} ${f(p.y - h - shW * 0.82)} Z" fill="url(#shadeGlow)"/>`
}

function tableLamp(room, c, { u, d, mount }) {
  const p = room.floorPoint(u, d)
  const s = room.depthScale(d)
  const base = mount ?? p.y - room.unit(d) * 0.15
  const shW = room.halfW * 0.062 * s
  return `<rect x="${f(p.x - room.halfW * 0.005 * s)}" y="${f(base - shW * 1.05)}" width="${f(room.halfW * 0.01 * s)}" height="${f(shW * 1.05)}" fill="${c.metal}"/>
    <path d="M ${f(p.x - shW * 0.62)} ${f(base - shW * 1.0)} L ${f(p.x + shW * 0.62)} ${f(base - shW * 1.0)} L ${f(p.x + shW * 0.42)} ${f(base - shW * 1.62)} L ${f(p.x - shW * 0.42)} ${f(base - shW * 1.62)} Z" fill="url(#shadeGlow)"/>`
}

function pendant(room, c, { u = 0, drop = 0.3, count = 1 } = {}) {
  let out = ''
  const offsets =
    count === 1 ? [u] : Array.from({ length: count }, (_, i) => u + (i - (count - 1) / 2) * 0.4)
  for (const o of offsets) {
    const x = room.cx + o * room.halfW
    const len = room.bw.y1 + room.wallH * drop
    const w = room.halfW * 0.1
    out += `<rect x="${f(x - room.W * 0.0014)}" y="0" width="${f(room.W * 0.0028)}" height="${f(len)}" fill="${c.metal}" opacity="0.75"/>
      <path d="M ${f(x - w / 2)} ${f(len + w * 0.46)} L ${f(x + w / 2)} ${f(len + w * 0.46)} L ${f(x + w * 0.2)} ${f(len)} L ${f(x - w * 0.2)} ${f(len)} Z" fill="url(#shadeGlow)"/>
      <ellipse cx="${f(x)}" cy="${f(len + w * 0.46)}" rx="${f(w / 2)}" ry="${f(w * 0.08)}" fill="${shade(c.metal, 0.4)}"/>`
  }
  return out
}

function rug(room, c, { u, d, w, l }) {
  const a = room.floorPoint(u - w / 2, d - l)
  const b = room.floorPoint(u + w / 2, d - l)
  const cc = room.floorPoint(u + w / 2, d + l)
  const dd = room.floorPoint(u - w / 2, d + l)
  const fill = mix(shade(c.textile, -0.1), c.accent, 0.14)
  return `<polygon points="${pts([[a.x, a.y], [b.x, b.y], [cc.x, cc.y], [dd.x, dd.y]])}" fill="${fill}"/>
    <polygon points="${pts([[a.x, a.y], [b.x, b.y], [cc.x, cc.y], [dd.x, dd.y]])}" fill="none" stroke="${shade(fill, -0.14)}" stroke-width="${f(room.W * 0.003)}" opacity="0.55"/>`
}

function wallArt(room, c, seed) {
  const r = rng(seed)
  const bwW = room.bw.x2 - room.bw.x1
  const bwH = room.wallH
  const frames = [
    { x: 0.07, y: 0.13, w: 0.2, h: 0.32 },
    { x: 0.295, y: 0.21, w: 0.14, h: 0.22 },
    { x: 0.69, y: 0.12, w: 0.24, h: 0.35 },
  ]
  return frames
    .map((fr) => {
      const x = room.bw.x1 + fr.x * bwW
      const y = room.bw.y1 + fr.y * bwH
      const w = fr.w * bwW
      const h = fr.h * bwH
      const inner = mix(c.wall, c.accent, 0.14 + r() * 0.34)
      return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${inner}" stroke="${shade(c.wood, -0.16)}" stroke-width="${f(bwW * 0.0045)}"/>
        <rect x="${f(x + w * 0.13)}" y="${f(y + h * 0.48)}" width="${f(w * 0.74)}" height="${f(h * 0.32)}" fill="${shade(inner, -0.2)}" opacity="0.5"/>`
    })
    .join('')
}

/* ── furniture sets ───────────────────────────────────────────────────────── */

function livingRoom(room, c) {
  const seatD = 0.52
  const fp = room.floorPoint(0, seatD)
  const halfSeat = (0.86 * room.halfW * room.depthScale(seatD)) / 2
  const seatTop = fp.y - room.unit(seatD) * 0.155

  let cushions = ''
  for (let i = 0; i < 3; i++) {
    const cw = (halfSeat * 2) / 3.15
    const x = fp.x - halfSeat + ((halfSeat * 2) / 3) * (i + 0.5)
    const ch = room.unit(seatD) * 0.135
    cushions += `<rect x="${f(x - cw / 2)}" y="${f(seatTop - ch + room.unit(seatD) * 0.02)}" width="${f(cw)}" height="${f(ch)}" rx="${f(cw * 0.05)}" fill="${shade(c.textile, i === 1 ? 0.1 : 0.17)}"/>`
  }

  const arms = [-1, 1]
    .map((k) =>
      volume(room, {
        u: k * 0.47,
        d: seatD,
        w: 0.12,
        h: 0.225,
        depth: 0.2,
        front: shade(c.textile, 0.06),
        top: shade(c.textile, 0.2),
        side: shade(c.textile, -0.14),
      }),
    )
    .join('')

  return `
    ${rug(room, c, { u: 0, d: 0.74, w: 1.34, l: 0.26 })}
    ${shadow(room, { u: 0, d: seatD, w: 0.9, opacity: 0.22 })}
    ${volume(room, { u: 0, d: seatD - 0.16, w: 0.86, h: 0.3, depth: 0.05, front: shade(c.textile, -0.02), top: shade(c.textile, 0.16), side: shade(c.textile, -0.12) })}
    ${volume(room, { u: 0, d: seatD, w: 0.86, h: 0.155, depth: 0.2, front: shade(c.textile, 0.02), top: shade(c.textile, 0.22), side: shade(c.textile, -0.1) })}
    ${cushions}${arms}
    ${shadow(room, { u: 0, d: 0.82, w: 0.5, opacity: 0.17 })}
    ${tableTop(room, { u: 0, d: 0.82, w: 0.46, depth: 0.16, h: 0.09, top: shade(c.wood, 0.16), edge: shade(c.wood, -0.1), leg: shade(c.wood, -0.2) })}
    ${floorLamp(room, c, { u: 0.92, d: 0.34 })}`
}

function bedroom(room, c) {
  const bedD = 0.62
  let pillows = ''
  for (const k of [-0.19, 0.19]) {
    const pp = room.floorPoint(k, 0.28)
    const pw = 0.3 * room.halfW * room.depthScale(0.28)
    const ph = room.unit(0.28) * 0.105
    pillows += `<rect x="${f(pp.x - pw / 2)}" y="${f(pp.y - room.unit(0.28) * 0.2)}" width="${f(pw)}" height="${f(ph)}" rx="${f(ph * 0.34)}" fill="${shade(c.textile, 0.42)}"/>
      <rect x="${f(pp.x - pw / 2)}" y="${f(pp.y - room.unit(0.28) * 0.2 + ph * 0.72)}" width="${f(pw)}" height="${f(ph * 0.28)}" fill="${shade(c.textile, 0.24)}" opacity="0.7"/>`
  }
  const fp = room.floorPoint(0, bedD)
  const hw = (0.78 * room.halfW * room.depthScale(bedD)) / 2
  const ty = fp.y - room.unit(bedD) * 0.135
  const nightstands = [-0.72, 0.72]
    .map(
      (u) => `${shadow(room, { u, d: 0.28, w: 0.15, opacity: 0.13 })}
        ${volume(room, { u, d: 0.28, w: 0.15, h: 0.16, depth: 0.09, front: shade(c.wood, -0.04), top: shade(c.wood, 0.16), side: shade(c.wood, -0.2) })}
        ${tableLamp(room, c, { u, d: 0.26 })}`,
    )
    .join('')

  return `
    ${rug(room, c, { u: 0, d: 0.92, w: 1.5, l: 0.2 })}
    ${nightstands}
    ${shadow(room, { u: 0, d: bedD, w: 0.82, opacity: 0.22 })}
    ${volume(room, { u: 0, d: 0.22, w: 0.8, h: 0.34, depth: 0.04, front: c.wood, top: shade(c.wood, 0.18), side: shade(c.wood, -0.16) })}
    ${volume(room, { u: 0, d: bedD, w: 0.78, h: 0.135, depth: 0.42, front: shade(c.textile, 0.16), top: shade(c.textile, 0.3), side: shade(c.textile, -0.06) })}
    <rect x="${f(fp.x - hw)}" y="${f(ty + room.unit(bedD) * 0.018)}" width="${f(hw * 2)}" height="${f(room.unit(bedD) * 0.062)}" fill="${mix(c.accent, c.textile, 0.55)}"/>
    <rect x="${f(fp.x - hw)}" y="${f(ty + room.unit(bedD) * 0.018)}" width="${f(hw * 2)}" height="${f(room.unit(bedD) * 0.012)}" fill="${mix(c.accent, c.textile, 0.34)}" opacity="0.6"/>
    ${pillows}`
}

function kitchen(room, c) {
  const stoneTop = shade(mix(c.floor, '#ffffff', 0.5), 0.2)
  const bwW = room.bw.x2 - room.bw.x1
  const uppers = `<rect x="${f(room.bw.x1 + bwW * 0.1)}" y="${f(room.bw.y1 + room.wallH * 0.12)}" width="${f(bwW * 0.8)}" height="${f(room.wallH * 0.2)}" fill="${shade(c.wood, 0.08)}"/>
    <rect x="${f(room.bw.x1 + bwW * 0.1)}" y="${f(room.bw.y1 + room.wallH * 0.315)}" width="${f(bwW * 0.8)}" height="${f(room.wallH * 0.012)}" fill="${shade(c.metal, -0.15)}" opacity="0.55"/>
    <rect x="${f(room.bw.x1 + bwW * 0.1)}" y="${f(room.bw.y1 + room.wallH * 0.46)}" width="${f(bwW * 0.8)}" height="${f(room.wallH * 0.16)}" fill="${shade(c.wall, -0.07)}"/>`

  let stools = ''
  for (const u of [-0.34, 0, 0.34]) {
    const p = room.floorPoint(u, 0.95)
    const s = room.depthScale(0.95)
    const w = room.halfW * 0.1 * s
    const h = room.unit(0.95) * 0.16
    stools += `${shadow(room, { u, d: 0.95, w: 0.1, opacity: 0.13 })}
      <rect x="${f(p.x - w * 0.07)}" y="${f(p.y - h)}" width="${f(w * 0.14)}" height="${f(h)}" fill="${c.metal}"/>
      <ellipse cx="${f(p.x)}" cy="${f(p.y - h)}" rx="${f(w * 0.55)}" ry="${f(w * 0.15)}" fill="${shade(c.accent, 0.12)}"/>`
  }

  return `${uppers}
    ${shadow(room, { u: 0, d: 0.16, w: 1.1, opacity: 0.14 })}
    ${volume(room, { u: 0, d: 0.16, w: 1.1, h: 0.25, depth: 0.1, front: shade(c.wood, 0.02), top: stoneTop, side: shade(c.wood, -0.16) })}
    ${shadow(room, { u: 0, d: 0.7, w: 0.76, opacity: 0.22 })}
    ${volume(room, { u: 0, d: 0.7, w: 0.76, h: 0.26, depth: 0.24, front: shade(c.wood, -0.1), top: stoneTop, side: shade(c.wood, -0.22) })}
    ${stools}`
}

function diningRoom(room, c) {
  const chairs = [
    [-0.46, 0.34],
    [0.46, 0.34],
    [-0.46, 0.86],
    [0.46, 0.86],
    [-0.86, 0.6],
    [0.86, 0.6],
  ]
    .map(([u, d]) =>
      chair(room, {
        u,
        d,
        seat: shade(c.textile, 0.04),
        back: shade(c.wood, -0.02),
        leg: shade(c.wood, -0.22),
      }),
    )
    .join('')

  return `
    ${rug(room, c, { u: 0, d: 0.62, w: 1.6, l: 0.34 })}
    ${chairs}
    ${shadow(room, { u: 0, d: 0.66, w: 0.66, opacity: 0.2 })}
    ${tableTop(room, { u: 0, d: 0.66, w: 0.66, depth: 0.3, h: 0.185, top: shade(c.wood, 0.18), edge: shade(c.wood, -0.08), leg: shade(c.wood, -0.22) })}
    <ellipse cx="${f(room.floorPoint(0, 0.6).x)}" cy="${f(room.floorPoint(0, 0.62).y - room.unit(0.62) * 0.19)}" rx="${f(room.halfW * 0.05 * room.depthScale(0.62))}" ry="${f(room.halfW * 0.014 * room.depthScale(0.62))}" fill="${shade(c.metal, 0.25)}"/>`
}

function office(room, c) {
  const deskD = 0.6
  const fp = room.floorPoint(-0.04, deskD)
  const deskTopY = fp.y - room.unit(deskD) * 0.22
  const dw = 0.72 * room.halfW * room.depthScale(deskD)
  const monW = dw * 0.32
  const monitor = `<rect x="${f(fp.x - monW / 2)}" y="${f(deskTopY - monW * 0.66)}" width="${f(monW)}" height="${f(monW * 0.6)}" rx="${f(monW * 0.02)}" fill="${shade(c.accent, 0.08)}"/>
    <rect x="${f(fp.x - monW / 2 + monW * 0.025)}" y="${f(deskTopY - monW * 0.635)}" width="${f(monW * 0.95)}" height="${f(monW * 0.55)}" fill="${mix(c.wall, '#ffffff', 0.35)}" opacity="0.55"/>
    <rect x="${f(fp.x - monW * 0.05)}" y="${f(deskTopY - monW * 0.06)}" width="${f(monW * 0.1)}" height="${f(monW * 0.06)}" fill="${shade(c.accent, 0.22)}"/>`

  const bwW = room.bw.x2 - room.bw.x1
  let shelves = ''
  const r = rng(41)
  for (const sy of [0.2, 0.4]) {
    const shelfY = room.bw.y1 + room.wallH * sy
    shelves += `<rect x="${f(room.bw.x1 + bwW * 0.06)}" y="${f(shelfY)}" width="${f(bwW * 0.3)}" height="${f(room.wallH * 0.02)}" fill="${shade(c.wood, -0.08)}"/>`
    for (let i = 0; i < 9; i++) {
      const bh = room.wallH * (0.055 + r() * 0.045)
      const bwid = bwW * 0.016
      shelves += `<rect x="${f(room.bw.x1 + bwW * 0.075 + i * bwid * 1.5)}" y="${f(shelfY - bh)}" width="${f(bwid)}" height="${f(bh)}" fill="${[c.accent, c.wood, c.textile, c.plant][i % 4]}" opacity="0.7"/>`
    }
  }

  return `${shelves}
    ${shadow(room, { u: -0.04, d: deskD, w: 0.72, opacity: 0.18 })}
    ${tableTop(room, { u: -0.04, d: deskD, w: 0.72, depth: 0.22, h: 0.22, top: shade(c.wood, 0.16), edge: shade(c.wood, -0.08), leg: shade(c.wood, -0.24) })}
    ${monitor}
    ${tableLamp(room, c, { u: 0.28, d: 0.54, mount: deskTopY })}
    ${chair(room, { u: -0.04, d: 0.95, scale: 1.25, seat: shade(c.textile, -0.06), back: shade(c.textile, 0.02), leg: c.metal })}`
}

function bathroom(room, c) {
  const bwW = room.bw.x2 - room.bw.x1
  const cols = 8
  const rows = 6
  let tiles = ''
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const tw = bwW / cols
      const th = room.wallH / rows
      tiles += `<rect x="${f(room.bw.x1 + i * tw + (j % 2 ? tw / 2 : 0))}" y="${f(room.bw.y1 + j * th)}" width="${f(tw - bwW * 0.004)}" height="${f(th - room.wallH * 0.006)}" fill="${shade(c.wall, j % 2 ? 0.05 : -0.03)}" opacity="0.75"/>`
    }
  }
  const stoneTop = shade(mix(c.floor, '#ffffff', 0.55), 0.18)
  const vp = room.floorPoint(-0.34, 0.5)
  const mw = room.halfW * 0.36
  return `${tiles}
    <rect x="${f(vp.x - mw / 2)}" y="${f(room.bw.y1 + room.wallH * 0.16)}" width="${f(mw)}" height="${f(room.wallH * 0.34)}" rx="${f(mw / 2)}" fill="${shade(c.wall, 0.2)}" stroke="${c.metal}" stroke-width="${f(mw * 0.022)}"/>
    ${shadow(room, { u: -0.34, d: 0.5, w: 0.5, opacity: 0.16 })}
    ${volume(room, { u: -0.34, d: 0.5, w: 0.5, h: 0.24, depth: 0.14, front: c.wood, top: stoneTop, side: shade(c.wood, -0.18) })}
    ${shadow(room, { u: 0.62, d: 0.7, w: 0.44, opacity: 0.17 })}
    ${volume(room, { u: 0.62, d: 0.7, w: 0.44, h: 0.14, depth: 0.3, front: shade(stoneTop, 0.06), top: shade(stoneTop, 0.14), side: shade(stoneTop, -0.1) })}`
}

function outdoor(room, c) {
  let slats = ''
  for (let i = 0; i < 15; i++) {
    const x = room.W * 0.02 + (i / 14) * room.W * 0.96
    slats += `<rect x="${f(x)}" y="0" width="${f(room.W * 0.011)}" height="${f(room.H * 0.17)}" fill="${c.wood}" opacity="0.88"/>`
  }
  const lounge = [-0.42, 0.42]
    .map(
      (u) => `${shadow(room, { u, d: 0.72, w: 0.38, opacity: 0.2 })}
        ${volume(room, { u, d: 0.72, w: 0.38, h: 0.125, depth: 0.28, front: shade(c.textile, 0.12), top: shade(c.textile, 0.26), side: shade(c.textile, -0.08) })}
        ${volume(room, { u, d: 0.5, w: 0.38, h: 0.27, depth: 0.05, front: shade(c.textile, 0.04), top: shade(c.textile, 0.18), side: shade(c.textile, -0.12) })}`,
    )
    .join('')
  return `${slats}${lounge}
    ${shadow(room, { u: 0, d: 0.92, w: 0.26, opacity: 0.16 })}
    ${tableTop(room, { u: 0, d: 0.92, w: 0.26, depth: 0.12, h: 0.1, top: shade(c.wood, 0.14), edge: shade(c.wood, -0.1), leg: shade(c.wood, -0.24) })}`
}

const FURNITURE = {
  living: livingRoom,
  bedroom,
  kitchen,
  dining: diningRoom,
  office,
  bathroom,
  outdoor,
}

/* ── the scene ────────────────────────────────────────────────────────────── */

/**
 * @param {object} opts
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {string} opts.kind        living | bedroom | kitchen | dining | office | bathroom | outdoor
 * @param {object} opts.colors      RenderPalette from the catalog
 * @param {'before'|'after'} opts.stage
 * @param {object} [opts.lighting]  lighting transform hints
 * @param {number} [opts.seed]
 */
export function renderScene({
  width: W,
  height: H,
  kind = 'living',
  colors,
  stage = 'after',
  lighting = { warmth: 4, vignette: 0.16, bloom: 0.2 },
  seed = 7,
}) {
  const room = makeRoom(W, H)
  const isBefore = stage === 'before'
  const isOutdoor = kind === 'outdoor'

  // A "before" plate is the same architecture stripped back to a builder
  // finish: greyed materials, no styling, flat light.
  const raw = isBefore
    ? {
        wall: desaturate(shade(colors.wall, -0.05), 0.82),
        ceiling: desaturate(shade(colors.ceiling, -0.04), 0.88),
        floor: desaturate(shade(colors.floor, -0.06), 0.75),
        wood: desaturate(colors.wood, 0.7),
        textile: desaturate(shade(colors.textile, 0.04), 0.82),
        accent: desaturate(colors.accent, 0.78),
        metal: desaturate(colors.metal, 0.9),
        plant: desaturate(colors.plant, 0.7),
      }
    : colors

  // Materials in a catalog palette sit close together by design; push floor,
  // wood and textile down in value so the render reads with photographic
  // tonal separation instead of tone-on-tone beige.
  const c = {
    ...raw,
    floor: shade(raw.floor, -0.13),
    wood: shade(raw.wood, -0.06),
    textile: shade(raw.textile, -0.17),
  }

  const warm = lighting?.warmth ?? 4
  const lightHue = mix('#ffffff', '#ffd8a4', clamp(warm / 13, 0, 0.8))
  const vig = isBefore ? 0.1 : (lighting?.vignette ?? 0.16)
  const bloom = isBefore ? 0.05 : (lighting?.bloom ?? 0.2)

  /* Window opening on the left wall, drawn as a perspective trapezoid. */
  const winTop = room.bw.y1 + room.wallH * 0.08
  const winBot = room.bw.y1 + room.wallH * 0.84
  const winFarX = room.bw.x1 * 0.88
  const winNearX = room.bw.x1 * 0.2
  const persp = (x, y) => {
    const t = (room.bw.x1 - x) / Math.max(1, room.bw.x1)
    const cy = room.H * 0.44
    return cy + (y - cy) * (1 + t * 0.62)
  }
  const windowPoly = pts([
    [winFarX, persp(winFarX, winTop)],
    [winNearX, persp(winNearX, winTop)],
    [winNearX, persp(winNearX, winBot)],
    [winFarX, persp(winFarX, winBot)],
  ])
  const mullX = (winFarX + winNearX) / 2
  const shaftPoly = pts([
    [winFarX, persp(winFarX, winTop)],
    [winNearX, persp(winNearX, winTop)],
    [W * 0.92, H],
    [W * 0.26, H],
  ])

  const furniture = (FURNITURE[kind] ?? livingRoom)(room, c)
  const showProps = !isBefore

  const pendantEl =
    showProps && ['dining', 'kitchen'].includes(kind)
      ? pendant(room, c, {
          u: 0,
          drop: kind === 'dining' ? 0.32 : 0.22,
          count: kind === 'kitchen' ? 2 : 1,
        })
      : ''

  const artEl =
    showProps && !isOutdoor && !['bathroom', 'kitchen'].includes(kind)
      ? wallArt(room, c, seed)
      : ''

  const plants = showProps
    ? plant(room, {
        u: -0.86,
        d: 0.46,
        scale: 1,
        pot: shade(c.wood, 0.12),
        leaf: c.plant,
      }) +
      (isOutdoor
        ? plant(room, { u: 1.08, d: 0.48, scale: 0.85, pot: shade(c.wood, -0.04), leaf: c.plant })
        : '')
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade(c.floor, -0.26)}"/>
      <stop offset="38%" stop-color="${shade(c.floor, 0.02)}"/>
      <stop offset="100%" stop-color="${shade(c.floor, -0.1)}"/>
    </linearGradient>
    <linearGradient id="wallG" x1="0.1" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="${shade(c.wall, 0.1)}"/>
      <stop offset="100%" stop-color="${shade(c.wall, -0.1)}"/>
    </linearGradient>
    <linearGradient id="leftWallG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${shade(c.wall, 0.14)}"/>
      <stop offset="100%" stop-color="${shade(c.wall, -0.16)}"/>
    </linearGradient>
    <linearGradient id="rightWallG" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${shade(c.wall, -0.24)}"/>
      <stop offset="100%" stop-color="${shade(c.wall, -0.06)}"/>
    </linearGradient>
    <linearGradient id="ceilG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${shade(c.ceiling, -0.14)}"/>
      <stop offset="100%" stop-color="${shade(c.ceiling, 0.06)}"/>
    </linearGradient>
    <linearGradient id="shaftG" x1="0.1" y1="0" x2="0.7" y2="1">
      <stop offset="0%" stop-color="${lightHue}" stop-opacity="${(0.42 * (0.45 + bloom)).toFixed(3)}"/>
      <stop offset="100%" stop-color="${lightHue}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${mix(lightHue, '#d7e2ea', 0.4)}"/>
      <stop offset="100%" stop-color="${mix(lightHue, '#ffffff', 0.55)}"/>
    </linearGradient>
    <radialGradient id="shadeGlow" cx="0.5" cy="0.35" r="0.75">
      <stop offset="0%" stop-color="${mix(lightHue, '#ffffff', 0.45)}"/>
      <stop offset="100%" stop-color="${mix(lightHue, c.wall, 0.5)}"/>
    </radialGradient>
    <radialGradient id="contact" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bloomG" cx="0.14" cy="0.32" r="0.66">
      <stop offset="0%" stop-color="${lightHue}" stop-opacity="${bloom.toFixed(3)}"/>
      <stop offset="100%" stop-color="${lightHue}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignetteG" cx="0.5" cy="0.44" r="0.8">
      <stop offset="52%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#181310" stop-opacity="${vig.toFixed(3)}"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${c.wall}"/>
  ${isOutdoor ? `<rect width="${W}" height="${H}" fill="url(#skyG)"/>` : ''}

  ${
    isOutdoor
      ? `<rect x="0" y="${f(H * 0.4)}" width="${W}" height="${f(H * 0.07)}" fill="${shade(c.plant, -0.22)}" opacity="0.45"/>`
      : `<polygon points="${pts([[0, 0], [W, 0], [room.bw.x2, room.bw.y1], [room.bw.x1, room.bw.y1]])}" fill="url(#ceilG)"/>
  <polygon points="${pts([[0, 0], [room.bw.x1, room.bw.y1], [room.bw.x1, room.bw.y2], [0, H]])}" fill="url(#leftWallG)"/>
  <polygon points="${pts([[W, 0], [room.bw.x2, room.bw.y1], [room.bw.x2, room.bw.y2], [W, H]])}" fill="url(#rightWallG)"/>
  <rect x="${f(room.bw.x1)}" y="${f(room.bw.y1)}" width="${f(room.bw.x2 - room.bw.x1)}" height="${f(room.wallH)}" fill="url(#wallG)"/>`
  }

  <polygon points="${pts([[0, H], [W, H], [room.bw.x2, room.bw.y2], [room.bw.x1, room.bw.y2]])}" fill="url(#floorG)"/>

  ${
    isOutdoor
      ? ''
      : `<polygon points="${windowPoly}" fill="url(#skyG)"/>
  <polygon points="${windowPoly}" fill="none" stroke="${shade(c.wall, -0.34)}" stroke-width="${f(W * 0.0038)}"/>
  <line x1="${f(mullX)}" y1="${f(persp(mullX, winTop))}" x2="${f(mullX)}" y2="${f(persp(mullX, winBot))}" stroke="${shade(c.wall, -0.34)}" stroke-width="${f(W * 0.0028)}"/>
  <polygon points="${shaftPoly}" fill="url(#shaftG)"/>
  <rect x="${f(room.bw.x1)}" y="${f(room.bw.y2 - H * 0.011)}" width="${f(room.bw.x2 - room.bw.x1)}" height="${f(H * 0.011)}" fill="${shade(c.wall, -0.2)}"/>`
  }

  ${artEl}
  ${pendantEl}
  ${furniture}
  ${plants}

  <rect width="${W}" height="${H}" fill="url(#bloomG)"/>
  <rect width="${W}" height="${H}" fill="url(#vignetteG)"/>
</svg>`
}
