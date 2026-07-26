import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] ?? 'http://localhost:3300'
const PATHNAME = process.argv[3] ?? '/'

const CHROME = [
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
].find((p) => p && existsSync(p))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars'],
})

const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 })
await page.goto(`${BASE}${PATHNAME}`, { waitUntil: 'networkidle2' })
await new Promise((r) => setTimeout(r, 1500))

const result = await page.evaluate(() => {
  const doc = document.documentElement
  const vw = doc.clientWidth
  const rows = []

  for (const el of document.querySelectorAll('*')) {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    if (rect.right <= vw + 1 && rect.left >= -1) continue

    const cs = getComputedStyle(el)
    const chain = []
    let node = el
    for (let i = 0; i < 4 && node; i++) {
      chain.push(
        `${node.tagName.toLowerCase()}${node.id ? '#' + node.id : ''}.${String(node.className).split(' ').slice(0, 3).join('.')}`,
      )
      node = node.parentElement
    }

    rows.push({
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: Math.round(rect.width),
      position: cs.position,
      text: (el.textContent ?? '').trim().slice(0, 40),
      chain: chain.join(' ← '),
    })
  }

  rows.sort((a, b) => b.right - a.right)

  return {
    viewport: vw,
    scrollWidth: doc.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    offenders: rows.slice(0, 8),
  }
})

console.log(`\n${PATHNAME} @ ${result.viewport}px`)
console.log(`documentElement.scrollWidth = ${result.scrollWidth}`)
console.log(`body.scrollWidth            = ${result.bodyScrollWidth}\n`)

for (const row of result.offenders) {
  console.log(
    `  right:${String(row.right).padStart(4)}  w:${String(row.width).padStart(4)}  ${row.position.padEnd(8)} ${row.chain}`,
  )
  if (row.text) console.log(`         "${row.text}"`)
}

await browser.close()
