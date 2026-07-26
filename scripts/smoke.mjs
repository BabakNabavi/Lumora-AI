/**
 * smoke.mjs — end-to-end verification against a running server.
 *
 *   node scripts/smoke.mjs [baseUrl]
 *
 * Walks the real product the way a user does: browses the marketing pages,
 * runs a guest generation, signs in, uploads, generates, favourites, shares,
 * downloads, then checks the admin surface and the authorisation boundaries.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

const BASE = process.argv[2] ?? 'http://localhost:3200'

let passed = 0
let failed = 0
const failures = []

function record(name, ok, detail) {
  if (ok) {
    passed += 1
    console.log(`  ✓ ${name}`)
  } else {
    failed += 1
    failures.push(`${name} — ${detail}`)
    console.log(`  ✗ ${name}  ${detail}`)
  }
}

/* ── cookie-jar fetch ─────────────────────────────────────────────────────── */

function makeClient() {
  const jar = new Map()

  return async function client(url, init = {}) {
    const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
    const res = await fetch(`${BASE}${url}`, {
      ...init,
      redirect: init.redirect ?? 'manual',
      headers: {
        ...(cookie ? { cookie } : {}),
        ...init.headers,
      },
    })

    for (const raw of res.headers.getSetCookie?.() ?? []) {
      const [pair] = raw.split(';')
      const idx = pair.indexOf('=')
      const name = pair.slice(0, idx).trim()
      const value = pair.slice(idx + 1).trim()
      if (value === '') jar.delete(name)
      else jar.set(name, value)
    }

    return res
  }
}

async function expectStatus(client, name, url, expected, init) {
  try {
    const res = await client(url, init)
    const list = Array.isArray(expected) ? expected : [expected]
    record(name, list.includes(res.status), `got ${res.status}, want ${list.join('/')}`)
    return res
  } catch (error) {
    record(name, false, error.message)
    return null
  }
}

async function json(res) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

/* ── run ──────────────────────────────────────────────────────────────────── */

console.log(`\nSmoke test → ${BASE}\n`)

const photo = await readFile(
  path.join(process.cwd(), 'public', 'assets', 'generated', 'demo', 'before.webp'),
)

/* 1 — public pages ---------------------------------------------------------- */
console.log('public pages')
const anon = makeClient()

await expectStatus(anon, 'GET /', '/', 200)
await expectStatus(anon, 'GET /inspirations', '/inspirations', 200)
await expectStatus(anon, 'GET /inspirations?style=japandi', '/inspirations?style=japandi', 200)
await expectStatus(anon, 'GET /studio', '/studio', 200)
await expectStatus(anon, 'GET /login', '/login', 200)
await expectStatus(anon, 'GET /signup', '/signup', 200)
await expectStatus(anon, 'GET /forgot-password', '/forgot-password', 200)
await expectStatus(anon, 'GET /sitemap.xml', '/sitemap.xml', 200)
await expectStatus(anon, 'GET /robots.txt', '/robots.txt', 200)
await expectStatus(anon, 'GET /icon.svg', '/icon.svg', 200)
await expectStatus(anon, 'GET /nope → 404', '/this-page-does-not-exist', 404)

/* 2 — auth boundaries ------------------------------------------------------- */
console.log('\nauthorisation')
await expectStatus(anon, '/dashboard redirects when signed out', '/dashboard', [307, 302])
await expectStatus(anon, '/admin redirects when signed out', '/admin', [307, 302])
await expectStatus(anon, 'GET /api/designs/x is 401', '/api/designs/xyz', 401)

/* 3 — guest demo generation -------------------------------------------------- */
console.log('\nguest demo')
{
  const form = new FormData()
  form.append('file', new Blob([photo], { type: 'image/webp' }), 'room.webp')

  const uploadRes = await anon('/api/upload', { method: 'POST', body: form })
  const upload = await json(uploadRes)
  record(
    'guest upload accepted',
    uploadRes.status === 200 && typeof upload.uploadId === 'string',
    `status ${uploadRes.status} ${upload.error ?? ''}`,
  )
  record(
    'guest upload is namespaced under uploads/guest/',
    String(upload.uploadId ?? '').startsWith('uploads/guest/'),
    upload.uploadId,
  )

  if (upload.uploadId) {
    const genRes = await anon('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        uploadId: upload.uploadId,
        roomType: 'bedroom',
        style: 'scandinavian',
        palette: 'warm',
        lighting: 'warm',
        mood: 'cozy',
      }),
    })
    const gen = await json(genRes)
    record(
      'guest generation succeeds',
      genRes.status === 200 && Boolean(gen.design?.resultUrl),
      `status ${genRes.status} ${gen.error ?? ''}`,
    )
    record('guest generation is flagged as demo', gen.isDemo === true, String(gen.isDemo))
    record(
      'generated image has AI insights',
      Array.isArray(gen.design?.insights) && gen.design.insights.length > 0,
      `${gen.design?.insights?.length ?? 0} insights`,
    )

    if (gen.design?.resultUrl) {
      const img = await anon(gen.design.resultUrl)
      record(
        'rendered image is served',
        img.status === 200 && (img.headers.get('content-type') ?? '').startsWith('image/'),
        `status ${img.status}`,
      )
    }

    // Second guest generation must be refused — the allowance is one.
    const second = await anon('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        uploadId: upload.uploadId,
        roomType: 'bedroom',
        style: 'modern',
        palette: 'neutral',
        lighting: 'soft',
        mood: 'calm',
      }),
    })
    record('second guest generation is refused', second.status === 403, `status ${second.status}`)
  }
}

/* 4 — validation ------------------------------------------------------------ */
console.log('\nvalidation')
{
  const form = new FormData()
  form.append('file', new Blob([Buffer.from('not an image')], { type: 'image/png' }), 'x.png')
  await expectStatus(anon, 'non-image upload is rejected', '/api/upload', 422, {
    method: 'POST',
    body: form,
  })

  await expectStatus(anon, 'bad brief is rejected', '/api/generate', 422, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ uploadId: 'uploads/guest/x.webp', style: 'not-a-style' }),
  })

  await expectStatus(anon, 'traversal key is refused', '/api/files/..%2F..%2Fpackage.json', [400, 404])
}

/* 5 — signed-in flow -------------------------------------------------------- */
console.log('\nsigned-in flow')
const user = makeClient()
let designId = null

{
  const loginRes = await user('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@interiorstudio.app', password: 'Studio2026' }),
  })
  record('login succeeds', loginRes.status === 200, `status ${loginRes.status}`)

  const bad = await makeClient()('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'demo@interiorstudio.app', password: 'wrong-password' }),
  })
  record('wrong password is rejected', bad.status === 401, `status ${bad.status}`)

  await expectStatus(user, 'GET /dashboard', '/dashboard', 200)
  await expectStatus(user, 'GET /dashboard/designs', '/dashboard/designs', 200)
  await expectStatus(user, 'GET /dashboard/designs?style=japandi', '/dashboard/designs?style=japandi', 200)
  await expectStatus(user, 'GET /dashboard/favorites', '/dashboard/favorites', 200)
  await expectStatus(user, 'GET /dashboard/credits', '/dashboard/credits', 200)
  await expectStatus(user, 'GET /dashboard/settings', '/dashboard/settings', 200)
  await expectStatus(user, 'non-admin is bounced from /admin', '/admin', [307, 302])
  await expectStatus(user, 'signed-in user is bounced from /login', '/login', [307, 302])

  const form = new FormData()
  form.append('file', new Blob([photo], { type: 'image/webp' }), 'room.webp')
  const upload = await json(await user('/api/upload', { method: 'POST', body: form }))

  const genRes = await user('/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      uploadId: upload.uploadId,
      roomType: 'living-room',
      style: 'luxury',
      palette: 'dark',
      lighting: 'dramatic',
      mood: 'luxury',
      title: 'Smoke Test Room',
    }),
  })
  const gen = await json(genRes)
  record(
    'authenticated generation succeeds',
    genRes.status === 200 && Boolean(gen.design?.id),
    `status ${genRes.status} ${gen.error ?? ''}`,
  )
  record(
    'a credit was spent',
    typeof gen.creditsRemaining === 'number',
    String(gen.creditsRemaining),
  )
  designId = gen.design?.id ?? null

  if (designId) {
    await expectStatus(user, 'GET /designs/[id]', `/designs/${designId}`, 200)

    const fav = await json(await user(`/api/designs/${designId}/favorite`, { method: 'POST' }))
    record('favourite toggles on', fav.isFavorite === true, String(fav.isFavorite))
    const unfav = await json(await user(`/api/designs/${designId}/favorite`, { method: 'POST' }))
    record('favourite toggles off', unfav.isFavorite === false, String(unfav.isFavorite))

    const share = await json(await user(`/api/designs/${designId}/share`, { method: 'POST' }))
    record('share link is created', typeof share.shareId === 'string', share.shareId)

    if (share.shareId) {
      await expectStatus(anon, 'shared page is public', `/s/${share.shareId}`, 200)
      await expectStatus(user, 'share link is revoked', `/api/designs/${designId}/share`, 200, {
        method: 'DELETE',
      })
      await expectStatus(anon, 'revoked share link 404s', `/s/${share.shareId}`, 404)
    }

    const download = await user(`/api/designs/${designId}/download`)
    record(
      'download returns an attachment',
      download.status === 200 &&
        (download.headers.get('content-disposition') ?? '').includes('attachment'),
      `status ${download.status}`,
    )

    const dupRes = await user(`/api/designs/${designId}/duplicate`, {
      method: 'POST',
    })
    const dup = await json(dupRes)
    record(
      'design can be duplicated',
      dupRes.status === 201 && dup.design?.id && dup.design.id !== designId,
      `status ${dupRes.status} ${dup.error ?? ''}`,
    )
    record(
      'the duplicate owns its own images',
      Boolean(dup.design?.resultUrl) && dup.design.resultUrl !== gen.design.resultUrl,
      'copy shares the original key',
    )
    if (dup.design?.id) {
      // Deleting the copy must not take the original's images with it.
      await user(`/api/designs/${dup.design.id}`, { method: 'DELETE' })
      const stillThere = await user(gen.design.resultUrl)
      record(
        "deleting a copy leaves the original's image intact",
        stillThere.status === 200,
        `status ${stillThere.status}`,
      )
    }

    const rename = await user(`/api/designs/${designId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Renamed By Smoke Test' }),
    })
    const renamed = await json(rename)
    record(
      'design can be renamed',
      renamed.design?.title === 'Renamed By Smoke Test',
      renamed.design?.title,
    )
  }
}

/* 6 — ownership boundary ---------------------------------------------------- */
console.log('\nownership')
const admin = makeClient()
{
  const loginRes = await admin('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'admin@interiorstudio.app', password: 'Studio2026' }),
  })
  record('admin login succeeds', loginRes.status === 200, `status ${loginRes.status}`)

  if (designId) {
    await expectStatus(
      admin,
      "another account cannot read someone else's design",
      `/api/designs/${designId}`,
      403,
    )
  }

  await expectStatus(admin, 'GET /admin', '/admin', 200)
  await expectStatus(admin, 'GET /admin/users', '/admin/users', 200)
  await expectStatus(admin, 'GET /admin/designs', '/admin/designs', 200)
  await expectStatus(admin, 'GET /admin/generations', '/admin/generations', 200)
}

/* 7 — clean up -------------------------------------------------------------- */
console.log('\ncleanup')
if (designId) {
  await expectStatus(user, 'design can be deleted', `/api/designs/${designId}`, 200, {
    method: 'DELETE',
  })
  await expectStatus(user, 'deleted design 404s', `/api/designs/${designId}`, 404)
}
await expectStatus(user, 'logout succeeds', '/api/auth/logout', 200, { method: 'POST' })
await expectStatus(user, '/dashboard redirects after logout', '/dashboard', [307, 302])

/* ── report ───────────────────────────────────────────────────────────────── */

console.log(`\n${'─'.repeat(56)}`)
console.log(`  ${passed} passed · ${failed} failed`)
if (failures.length > 0) {
  console.log('')
  for (const f of failures) console.log(`  ✗ ${f}`)
}
console.log('')

process.exit(failed === 0 ? 0 : 1)
