// Mobile + desktop quality pass over the app's pages, signed out and signed in:
// horizontal overflow, page errors, failed requests, tap targets under 44px (mobile),
// unlabeled controls, images without alt, and slow pages. Writes a screenshot per page.
// Usage: node scripts/audit.mjs <baseUrl> <outDir>   (server needs ADMIN_EMAILS to include audit@rondje.test)
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const [base = 'http://localhost:3100', out = 'audit'] = process.argv.slice(2)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })

const publicPaths = ['/', '/dogs', '/dogs/demo-saar', '/shelters', '/group-walks', '/login', '/signup', '/forgot-password', '/help', '/safety', '/support', '/about', '/suggest', '/legal/terms', '/shelter', '/cities', '/cities/amsterdam']
const privatePaths = ['/onboarding', '/profile', '/profile/edit', '/profile/quiz', '/my-dogs', '/my-dogs/new', '/requests', '/notifications', '/admin']
const viewports = { mobile: { viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true }, desktop: { viewport: { width: 1366, height: 900 } } }

async function check(page, path, label) {
  const errors = []
  const onErr = (e) => errors.push(`pageerror: ${e.message.slice(0, 160)}`)
  const onResp = (r) => { if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url().replace(base, '')}`) }
  page.on('pageerror', onErr)
  page.on('response', onResp)
  const t0 = Date.now()
  await page.goto(base + path, { waitUntil: 'networkidle' })
  const ms = Date.now() - t0
  await page.waitForTimeout(300)
  const found = await page.evaluate((mobile) => {
    const issues = []
    const vw = window.innerWidth
    if (document.documentElement.scrollWidth > vw + 1) {
      const wide = [...document.querySelectorAll('body *')].filter((el) => {
        const r = el.getBoundingClientRect()
        return r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed'
      }).slice(-3).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`)
      issues.push(`horizontal overflow (${document.documentElement.scrollWidth}px): ${wide.join(', ')}`)
    }
    const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !el.closest('[hidden],nextjs-portal') }
    const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    if (mobile) {
      for (const el of document.querySelectorAll('a, button, input:not([type=hidden]), select, [role=button], summary')) {
        if (!visible(el)) continue
        const r = el.getBoundingClientRect()
        // Inline links inside running text are exempt (WCAG 2.5.8).
        if (el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li')) continue
        // Map attribution is a legal credit, not a control.
        if (el.closest('.leaflet-control-attribution')) continue
        if (el.type === 'checkbox' || el.type === 'radio') { if (el.closest('label')) continue }
        if (r.height < 44 && r.width < 44 || r.height < 32) issues.push(`small target ${Math.round(r.width)}x${Math.round(r.height)}: <${el.tagName.toLowerCase()}> "${name(el)}"`)
      }
    }
    for (const el of document.querySelectorAll('input:not([type=hidden]), select, textarea')) {
      if (!visible(el)) continue
      const labelled = el.labels?.length || el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')
      if (!labelled) issues.push(`unlabeled <${el.tagName.toLowerCase()} name=${el.name}>`)
    }
    for (const el of document.querySelectorAll('button, a')) {
      if (visible(el) && !name(el) && !el.querySelector('img[alt]:not([alt=""])')) issues.push(`control without name: <${el.tagName.toLowerCase()} class=${el.className}>`)
    }
    for (const img of document.querySelectorAll('img:not([alt])')) issues.push(`img without alt: ${img.src.slice(0, 60)}`)
    if (!document.querySelector('h1')) issues.push('no <h1>')
    return issues
  }, label === 'mobile')
  page.off('pageerror', onErr)
  page.off('response', onResp)
  if (ms > 4000) errors.push(`slow: ${ms} ms`)
  const file = `${(path === '/' ? 'home' : path.replace(/\//g, '_').replace(/^_/, ''))}-${label}`
  await page.screenshot({ path: `${out}/${file}.png`, fullPage: label === 'desktop' })
  return [...errors, ...new Set(found)]
}

const report = {}
for (const [label, device] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ ...device, locale: 'nl-NL', geolocation: { latitude: 52.09, longitude: 5.12 }, permissions: ['geolocation'], extraHTTPHeaders: { 'x-forwarded-for': `10.9.${label.length}.${Math.floor(Math.random() * 250)}` } })
  const page = await ctx.newPage()
  for (const p of publicPaths) report[`${label} ${p}`] = await check(page, p, label)
  // Sign in (or up) as the audit account.
  await page.goto(base + '/signup')
  await page.getByLabel('Voornaam').fill('Audit')
  await page.getByLabel('E-mailadres').fill('audit@rondje.test')
  await page.getByLabel('Wachtwoord').fill('wandelen-123')
  await page.getByRole('button', { name: 'Account maken' }).click()
  await page.waitForTimeout(2500)
  if (!page.url().includes('/onboarding')) {
    await page.goto(base + '/login')
    await page.getByLabel('E-mailadres').fill('audit@rondje.test')
    await page.getByLabel('Wachtwoord').fill('wandelen-123')
    await page.getByRole('button', { name: 'Inloggen', exact: true }).click()
    await page.waitForTimeout(2500)
  }
  if (page.url().includes('/onboarding')) {
    await page.getByLabel('Geboortedatum').fill('1999-05-05')
    const walk = page.getByLabel('Ik wil wandelen met honden')
    if (!(await walk.isChecked())) await walk.click()
    const dogs = page.getByLabel(/Ik heb een hond/)
    if (!(await dogs.isChecked())) await dogs.click()
    await page.getByLabel('Over jou').fill('Audit account')
    await page.getByLabel('Plaats').fill('Utrecht')
    await page.getByRole('button', { name: 'Gebruik mijn locatie' }).click()
    await page.getByLabel(/Ik ben 18 jaar of ouder/).check()
    await page.getByRole('button', { name: 'Profiel opslaan' }).click()
    await page.waitForTimeout(2500)
  }
  for (const p of privatePaths) report[`${label} ${p} (signed in)`] = await check(page, p, label)
  await ctx.close()
}
await browser.close()
const bad = Object.entries(report).filter(([, v]) => v.length)
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2))
for (const [k, v] of bad) console.log(`\n${k}\n  - ${v.join('\n  - ')}`)
console.log(`\n${bad.length} of ${Object.keys(report).length} page views have findings`)
