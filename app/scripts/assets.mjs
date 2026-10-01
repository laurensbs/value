// Generates app icons and the link-preview image (og.png) into public/.
// Usage: node scripts/assets.mjs   (uses PW_CHROMIUM_PATH if set)
import { chromium } from '@playwright/test'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const { DogFace } = await vite.ssrLoadModule('/src/components/DogFace.tsx')
const { DOGS } = await vite.ssrLoadModule('/src/data/dogs.ts')
await vite.close()

// Fonts are inlined: a page loaded with setContent may not read file:// URLs.
const font = (pkg, file) =>
  `data:font/woff2;base64,${readFileSync(resolve('node_modules', pkg, 'files', file)).toString('base64')}`
const FONTS = `
@font-face { font-family: 'Bricolage'; font-weight: 200 800; src: url(${font('@fontsource-variable/bricolage-grotesque', 'bricolage-grotesque-latin-wght-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Figtree'; font-weight: 300 900; src: url(${font('@fontsource-variable/figtree', 'figtree-latin-wght-normal.woff2')}) format('woff2'); }
@font-face { font-family: 'Caveat'; font-weight: 600; src: url(${font('@fontsource/caveat', 'caveat-latin-600-normal.woff2')}) format('woff2'); }
`

const GREEN = '#1f5a3d'
const BALL = '#d9f05a'

// Rounded: the in-app mark. Square: full-bleed app icon, ring inside the maskable safe zone.
const logo = (rounded) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${rounded ? 18 : 0}" fill="${GREEN}"/>
  <circle cx="32" cy="32" r="14" fill="none" stroke="${BALL}" stroke-width="5" stroke-dasharray="4 7" stroke-linecap="round"/>
  <circle cx="32" cy="18" r="5.5" fill="${BALL}"/>
</svg>`

const dog = (id, size) => {
  const d = DOGS.find((x) => x.id === id)
  return { svg: renderToStaticMarkup(createElement(DogFace, { look: d.look, size })), tile: d.tile, name: d.name }
}

const og = () => {
  const dogs = ['saar', 'kees', 'bolle', 'luna'].map((id) => dog(id, 150))
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${FONTS}
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; background: #f4f6f0; color: #16201a; font-family: Figtree, sans-serif; display: grid; grid-template-columns: 1fr 470px; gap: 40px; padding: 64px 70px; overflow: hidden; }
.brand { display: flex; align-items: center; gap: 16px; font-family: Bricolage; font-weight: 750; font-size: 40px; letter-spacing: -0.02em; }
.brand svg { width: 64px; height: 64px; }
h1 { font-family: Bricolage; font-weight: 780; font-size: 68px; line-height: 1.04; letter-spacing: -0.03em; margin-top: 44px; }
mark { background: ${BALL}; color: #16201a; padding: 0 0.12em; border-radius: 0.2em 0.45em 0.25em 0.4em; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
p { margin-top: 30px; font-size: 26px; color: #55635a; font-weight: 600; }
.grid { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-content: center; }
.tile { aspect-ratio: 1; border-radius: 36px; display: grid; place-items: center; position: relative; z-index: 1; }
.tile:nth-child(2) { transform: translateY(26px) rotate(2deg); }
.tile:nth-child(3) { transform: rotate(-2deg); }
.tile:nth-child(4) { transform: translateY(26px); }
.route { position: absolute; inset: -30px; z-index: 0; }
.note { position: absolute; z-index: 2; right: -6px; bottom: -14px; font-family: Caveat; font-weight: 600; font-size: 34px; color: ${GREEN}; transform: rotate(-4deg); background: #f4f6f0; padding: 0 8px; border-radius: 10px; }
</style></head><body>
<div>
  <div class="brand">${logo(true)}<span>Rondje</span></div>
  <h1>Een vast rondje met een hond <mark>die op je wacht.</mark></h1>
  <p>Gratis · vanaf 18 jaar · de eerste keer samen met de eigenaar</p>
</div>
<div class="grid">
  <svg class="route" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M5 30 C 30 -5, 70 60, 95 20 M10 90 C 40 60, 60 110, 92 75" fill="none" stroke="#16201a" stroke-opacity="0.2" stroke-width="0.9" stroke-dasharray="0.3 2.6" stroke-linecap="round"/></svg>
  ${dogs.map((d) => `<div class="tile" style="background:${d.tile}">${d.svg}</div>`).join('')}
  <span class="note">Wie gaat er mee?</span>
</div>
</body></html>`
}

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })
const shot = async (html, width, height, path) => {
  const page = await browser.newPage({ viewport: { width, height } })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path, omitBackground: false })
  await page.close()
}
const iconPage = (svg, size) =>
  `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`

await shot(iconPage(logo(false), 512), 512, 512, 'public/icon-maskable-512.png')
await shot(iconPage(logo(false), 192), 192, 192, 'public/icon-192.png')
await shot(iconPage(logo(false), 512), 512, 512, 'public/icon-512.png')
await shot(iconPage(logo(false), 180), 180, 180, 'public/apple-touch-icon.png')
await shot(og(), 1200, 630, 'public/og.png')
await browser.close()
console.log('icons and og.png written to public/')
