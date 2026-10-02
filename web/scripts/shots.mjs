// Screenshots of key pages for design review: node scripts/shots.mjs <baseUrl> <outDir> [paths...]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const [base = 'http://localhost:3100', out = 'shots', ...paths] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })
const targets = paths.length ? paths : ['/', '/dogs', '/dogs/demo-saar']
for (const scheme of ['light', 'dark']) {
  for (const [label, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1366, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1.5, locale: 'nl-NL' })
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    for (const p of targets) {
      await page.goto(base + p, { waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
      const name = `${p === '/' ? 'home' : p.replace(/\//g, '_').replace(/^_/, '')}-${label}-${scheme}`
      await page.screenshot({ path: `${out}/${name}.png`, fullPage: label === 'mobile' ? false : true })
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      if (overflow) errors.push(`${p}: horizontal overflow`)
    }
    if (errors.length) console.log(label, scheme, errors)
    await ctx.close()
  }
}
await browser.close()
console.log('done')
