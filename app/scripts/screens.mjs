// Takes screenshots of the main screens for design review.
// Usage: node scripts/screens.mjs [outDir]  (expects `vite preview` on :4173)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const out = process.argv[2] ?? 'e2e/screenshots'
mkdirSync(out, { recursive: true })
const base = process.env.BASE_URL ?? 'http://localhost:4173/'
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })

async function shoot(name, { width, height, scheme }, steps = async () => {}) {
  const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(base)
  await page.waitForLoadState('networkidle')
  await steps(page)
  await page.waitForTimeout(450)
  await page.screenshot({ path: `${out}/${name}-${scheme}.png` })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  if (overflow) errors.push('horizontal overflow')
  if (errors.length) console.log(name, scheme, errors)
  await page.close()
}

const mobile = { width: 390, height: 844 }
for (const scheme of ['light', 'dark']) {
  const m = { ...mobile, scheme }
  await shoot('01-discover', m)
  await shoot('02-detail', m, async (p) => p.getByRole('button', { name: /Saar/ }).first().click())
  await shoot('03-safety', m, async (p) => {
    await p.getByRole('button', { name: /^Mo/ }).first().click()
    await p.getByRole('button', { name: /Loop mee met Mo/ }).click()
    await p.getByText('Ja', { exact: true }).click()
  })
  await shoot('04-walks', m, async (p) => p.getByRole('navigation').getByRole('button', { name: /Rondjes/ }).click())
  await shoot('05-walking', m, async (p) => {
    await p.getByRole('navigation').getByRole('button', { name: /Rondjes/ }).click()
    await p.getByRole('button', { name: /Start rondje/ }).click()
    await p.getByRole('radio', { name: /Matig/ }).click()
  })
  await shoot('06-done', m, async (p) => {
    await p.getByRole('navigation').getByRole('button', { name: /Rondjes/ }).click()
    await p.getByRole('button', { name: /Start rondje/ }).click()
    await p.getByRole('radio', { name: /Matig/ }).click()
    await p.getByRole('button', { name: /Rondje klaar/ }).click()
    await p.getByRole('radio', { name: /Goed/ }).click()
  })
  await shoot('09-before', m, async (p) => {
    await p.getByRole('navigation').getByRole('button', { name: /Rondjes/ }).click()
    await p.getByRole('button', { name: /Start rondje/ }).click()
  })
  await shoot('10-signup', m, async (p) => p.getByRole('button', { name: 'Meld een hond aan' }).click())
  await shoot('11-owner-cta', m, async (p) => {
    await p.getByRole('button', { name: 'Meld een hond aan' }).scrollIntoViewIfNeeded()
  })
  await shoot('12-buddy', m, async (p) => {
    await p.getByRole('button', { name: /^Tess/ }).click()
    await p.getByRole('button', { name: 'Maak kennis met Tess' }).click()
    const d = p.getByRole('dialog')
    await d.getByText('Ja', { exact: true }).click()
    for (const box of await d.getByRole('checkbox').all()) await box.check({ force: true })
    await d.getByRole('button', { name: 'Ik doe mee' }).click()
    await d.getByRole('button', { name: 'Verstuur aanvraag' }).click()
    await d.getByRole('button', { name: 'Naar mijn rondjes' }).click()
    await p.locator('.planned', { hasText: 'Tess' }).getByRole('button', { name: /Start rondje/ }).click()
    await p.getByRole('radio', { name: /Matig/ }).click()
    await p.getByRole('button', { name: 'Rondje klaar' }).click()
    await p.getByRole('radio', { name: /Goed/ }).click()
    await p.getByRole('radio', { name: 'vrijdag 11:00' }).click()
  })
  await shoot('13-org', m, async (p) => {
    await p.getByRole('navigation').getByRole('button', { name: 'Hulp' }).click()
    await p.getByRole('button', { name: /Voor welzijnswerk/ }).click()
  })
  await shoot('07-help', m, async (p) => p.getByRole('navigation').getByRole('button', { name: 'Hulp' }).click())
  await shoot('08-desktop', { width: 1440, height: 900, scheme })
  await shoot('14-desktop-org', { width: 1440, height: 900, scheme }, async (p) =>
    p.getByRole('button', { name: 'Bekijk hoe een pilot werkt' }).click(),
  )
}
await browser.close()
console.log('done')
