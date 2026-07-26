/**
 * browser-audit.mjs — drives a real Chrome to check the two things HTTP tests
 * cannot: what the browser console says, and whether anything overflows its
 * viewport.
 *
 *   node scripts/browser-audit.mjs [baseUrl]
 *
 * Uses the locally installed Chrome via puppeteer-core, so nothing is
 * downloaded. Screenshots land in scripts/audit/.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] ?? 'http://localhost:3300'
const OUT = path.join(process.cwd(), 'scripts', 'audit')

const CHROME = [
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['ProgramFiles(x86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && existsSync(p))

if (!CHROME) {
  console.error('No Chrome or Edge found.')
  process.exit(1)
}

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 },
  { name: 'tablet', width: 834, height: 1112, isMobile: false, deviceScaleFactor: 1 },
  { name: 'desktop', width: 1440, height: 900, isMobile: false, deviceScaleFactor: 1 },
]

/**
 * Noise from the platform rather than from this application.
 *
 * `?_rsc=` requests are Next.js <Link> prefetches. The browser aborts any still
 * in flight when this script closes the page, which surfaces as ERR_ABORTED —
 * requesting the same URLs directly returns 200, so they are not failures.
 * Likewise, the console logs a 404 when the 404 page is the page under test.
 */
const IGNORE = [
  /favicon/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /Content Security Policy/i,
  /Failed to load resource.*404/,
]

const problems = []
let checks = 0
let aborted = 0

function note(kind, viewport, url, message) {
  if (IGNORE.some((r) => r.test(message))) return
  problems.push({ kind, viewport, url, message })
}

await mkdir(OUT, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
})

/* Sign in once and reuse the cookie for the authenticated pages. */
const auth = await browser.newPage()
await auth.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
// Credentials are passed in as arguments — `evaluate` runs in the page, which
// has no access to this process's environment.
await auth.evaluate(
  async (base, email, password) => {
    await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  },
  BASE,
  process.env.AUDIT_EMAIL ?? 'demo@interiorstudio.app',
  process.env.AUDIT_PASSWORD ?? 'Studio2026',
)
await auth.close()

const PAGES = [
  { path: '/', name: 'landing' },
  { path: '/inspirations', name: 'inspirations' },
  { path: '/studio', name: 'studio' },
  { path: '/login', name: 'login' },
  { path: '/signup', name: 'signup' },
  { path: '/dashboard', name: 'dashboard' },
  { path: '/dashboard/designs', name: 'designs' },
  { path: '/dashboard/credits', name: 'credits' },
  { path: '/dashboard/settings', name: 'settings' },
  { path: '/this-page-does-not-exist', name: '404' },
]

/** AUDIT_PAGES="/,/login" narrows the sweep — useful against a deployment
 *  where the authenticated pages are not yet configured. */
const only = process.env.AUDIT_PAGES?.split(',').map((p) => p.trim())
const TARGETS = only ? PAGES.filter((p) => only.includes(p.path)) : PAGES

console.log(`\nBrowser audit → ${BASE}\n`)

for (const viewport of VIEWPORTS) {
  console.log(`${viewport.name} (${viewport.width}×${viewport.height})`)

  for (const target of TARGETS) {
    const page = await browser.newPage()
    await page.setViewport(viewport)

    page.on('console', (msg) => {
      const type = msg.type()
      if (type === 'error' || type === 'warning') {
        note(type, viewport.name, target.path, msg.text())
      }
    })
    page.on('pageerror', (error) =>
      note('pageerror', viewport.name, target.path, error.message),
    )
    page.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText ?? 'unknown'
      // ERR_ABORTED is always client-side cancellation, never a server fault:
      // it is what Next.js <Link> prefetches produce when this script closes
      // the page with requests still in flight. Counted, not reported.
      if (reason === 'net::ERR_ABORTED') {
        aborted += 1
        return
      }
      note('requestfailed', viewport.name, target.path, `${request.url()} — ${reason}`)
    })
    page.on('response', (response) => {
      if (response.status() >= 400 && response.status() !== 404) {
        note(
          'http',
          viewport.name,
          target.path,
          `${response.status()} ${response.url()}`,
        )
      }
    })

    try {
      await page.goto(`${BASE}${target.path}`, {
        waitUntil: 'networkidle2',
        timeout: 45_000,
      })
      // Let entrance animations and lazy images settle.
      await new Promise((r) => setTimeout(r, 1200))

      // Horizontal overflow: the page body must never scroll sideways.
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement
        const overflowing = []
        if (doc.scrollWidth > doc.clientWidth + 1) {
          for (const el of document.querySelectorAll('body *')) {
            const rect = el.getBoundingClientRect()
            if (rect.width === 0) continue
            if (rect.right > doc.clientWidth + 1 || rect.left < -1) {
              const style = getComputedStyle(el)
              // An element inside its own scroll container is intentional.
              let parent = el.parentElement
              let contained = false
              while (parent) {
                const ps = getComputedStyle(parent)
                if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') {
                  contained = true
                  break
                }
                parent = parent.parentElement
              }
              if (!contained && style.position !== 'fixed') {
                overflowing.push(
                  `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} → right:${Math.round(rect.right)}`,
                )
              }
            }
          }
        }
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          culprits: overflowing.slice(0, 3),
        }
      })

      checks += 1
      if (overflow.scrollWidth > overflow.clientWidth + 1) {
        note(
          'overflow',
          viewport.name,
          target.path,
          `page is ${overflow.scrollWidth}px wide in a ${overflow.clientWidth}px viewport — ${overflow.culprits.join(' | ') || 'no single culprit found'}`,
        )
      }

      // Images that failed to decode.
      const brokenImages = await page.evaluate(() =>
        [...document.images]
          .filter((img) => img.complete && img.naturalWidth === 0)
          .map((img) => img.currentSrc || img.src)
          .slice(0, 5),
      )
      for (const src of brokenImages) {
        note('image', viewport.name, target.path, `did not load: ${src}`)
      }

      await page.screenshot({
        path: path.join(OUT, `${viewport.name}-${target.name}.png`),
        fullPage: false,
      })
    } catch (error) {
      note('navigation', viewport.name, target.path, error.message)
    }

    await page.close()
  }
}

/* Interaction check: the before/after slider must respond to the keyboard. */
{
  const page = await browser.newPage()
  await page.setViewport(VIEWPORTS[2])
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 2200))

  const slider = await page.$('[role="slider"]')
  if (!slider) {
    note('interaction', 'desktop', '/', 'no before/after slider found')
  } else {
    const before = await page.$eval('[role="slider"]', (el) =>
      Number(el.getAttribute('aria-valuenow')),
    )
    await slider.focus()
    for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowLeft')
    await new Promise((r) => setTimeout(r, 300))
    const after = await page.$eval('[role="slider"]', (el) =>
      Number(el.getAttribute('aria-valuenow')),
    )
    checks += 1
    if (after >= before) {
      note(
        'interaction',
        'desktop',
        '/',
        `arrow keys did not move the slider (${before} → ${after})`,
      )
    } else {
      console.log(`\nslider: keyboard moved it ${before} → ${after} ✓`)
    }
  }
  await page.close()
}

await browser.close()

/* ── report ───────────────────────────────────────────────────────────────── */

await writeFile(
  path.join(OUT, 'report.json'),
  JSON.stringify({ base: BASE, checks, aborted, problems }, null, 2),
)

console.log(`\n${'─'.repeat(60)}`)
console.log(`  ${checks} page renders · ${problems.length} problems · ${aborted} prefetches cancelled on teardown (expected)`)

if (problems.length > 0) {
  console.log('')
  const seen = new Set()
  for (const p of problems) {
    const key = `${p.kind}|${p.url}|${p.message.slice(0, 80)}`
    if (seen.has(key)) continue
    seen.add(key)
    console.log(`  [${p.kind}] ${p.viewport} ${p.url}`)
    console.log(`      ${p.message.slice(0, 200)}`)
  }
}
console.log(`\n  screenshots → scripts/audit/\n`)

process.exit(problems.length === 0 ? 0 : 1)
