import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] ?? 'http://localhost:3300'
const CHROME = [
  `${process.env.ProgramFiles}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['ProgramFiles(x86)']}\\Microsoft\\Edge\\Application\\msedge.exe`,
].find((p) => p && existsSync(p))

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars'],
})

for (const vp of [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage()
  await page.setViewport(vp)
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' })
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await new Promise((r) => setTimeout(r, 900))

  const footer = await page.$('footer')
  await footer.screenshot({ path: `scripts/audit/footer-${vp.name}.png` })

  // Confirm both links resolve to the right destinations.
  const links = await page.evaluate(() =>
    [...document.querySelectorAll('footer a[target="_blank"]')].map((a) => ({
      href: a.href,
      label: a.getAttribute('aria-label') ?? a.textContent.trim(),
      rel: a.rel,
    })),
  )
  console.log(vp.name, JSON.stringify(links))
  await page.close()
}

await browser.close()
