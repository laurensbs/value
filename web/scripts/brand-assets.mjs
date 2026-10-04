// Renders every logo image from the brand sources in assets/brand/ (logo B, "het woordmerk": "rondje
// mee" with the tennis ball as the dot on the j). Run it after changing a source:
//
//   node scripts/brand-assets.mjs
//
// It writes:
// - public/: favicon.svg + favicon.ico (16 and 32 px), apple-touch-icon.png, icon-192.png, icon-512.png
//   and icon-maskable-512.png (the word within the maskable safe zone);
// - assets/: the source images for `npx @capacitor/assets generate` (icon-only, icon-foreground,
//   icon-background, splash, splash-dark);
// - the Capacitor shells: every existing app icon and splash screen in ios/App and android/app,
//   re-rendered at its own size, so nothing else is needed for those.
//
// Uses the Chromium of Playwright (set PW_CHROMIUM_PATH to use another one).
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const ROOT = path.resolve(import.meta.dirname, '..')
const src = (name) => fs.readFileSync(path.join(ROOT, 'assets/brand', name), 'utf8')

const BOS = '#1b4a34'
const PAPER = '#f4f6f0' // the site's light background (splash)
const NIGHT = '#0d1310' // the site's dark background (splash)

// The app icon: the stacked word ("rondje" over "mee") on forest green, square (iOS and Android mask it).
const appIcon = src('app-icoon-licht.svg')
const iconBody = appIcon.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
const word = iconBody.replace(/<rect[^>]*\/>/, '')
// The word a little smaller, so it stays inside the circle that maskable and adaptive icons may cut out.
const safeWord = `<g transform="translate(512 512) scale(0.82) translate(-512 -512)">${word}</g>`
const svg = (body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"${extra}>${body}</svg>`

const icons = {
  app: appIcon,
  maskable: svg(`<rect width="1024" height="1024" fill="${BOS}"/>${safeWord}`),
  foreground: svg(safeWord),
  background: svg(`<rect width="1024" height="1024" fill="${BOS}"/>`),
  // Android's old-style launcher icon: the square icon with a small transparent margin.
  legacy: svg(`<g transform="translate(43 43) scale(0.916)">${iconBody}</g>`),
  round: svg(`<circle cx="512" cy="512" r="512" fill="${BOS}"/>${safeWord}`),
}

// A splash screen: the app icon with rounded corners in the middle, as large as before (520 of 2732).
const splash = (w, h, bg) => {
  const size = Math.round((520 * Math.max(w, h)) / 2732)
  return `<div style="width:${w}px;height:${h}px;background:${bg};display:grid;place-items:center"><div style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.28)}px;overflow:hidden">${appIcon.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div></div>`
}

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })

/** Renders HTML or an SVG string to a PNG buffer of exactly w x h. */
async function render(content, w, h = w, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const html = content.startsWith('<svg') ? content.replace('<svg ', `<svg width="${w}" height="${h}" style="display:block" `) : content
  await page.setContent(`<html><body style="margin:0;background:transparent">${html}</body></html>`)
  const png = await page.screenshot({ omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } })
  await page.close()
  return png
}

function write(rel, data) {
  fs.mkdirSync(path.dirname(path.join(ROOT, rel)), { recursive: true })
  fs.writeFileSync(path.join(ROOT, rel), data)
  console.log('wrote', rel)
}

/** Packs PNGs into one .ico file (the PNG-in-ICO format every current browser reads). */
function ico(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  let offset = 6 + 16 * pngs.length
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size >= 256 ? 0 : size, 0)
    e.writeUInt8(size >= 256 ? 0 : size, 1)
    e.writeUInt16LE(1, 4) // colour planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(data.length, 8)
    e.writeUInt32LE(offset, 12)
    offset += data.length
    return e
  })
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)])
}

/** Width and height of an existing PNG, read from its header. */
function pngSize(file) {
  const b = fs.readFileSync(file)
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}

// ---- Website ----
const favicon = src('favicon.svg')
write('public/favicon.svg', favicon)
const faviconPngs = []
for (const size of [16, 32]) faviconPngs.push({ size, data: await render(favicon, size, size, { transparent: true }) })
write('public/favicon.ico', ico(faviconPngs))
write('public/apple-touch-icon.png', await render(icons.app, 180))
write('public/icon-192.png', await render(icons.app, 192))
write('public/icon-512.png', await render(icons.app, 512))
write('public/icon-maskable-512.png', await render(icons.maskable, 512))

// ---- Capacitor sources (for `npx @capacitor/assets generate`) ----
write('assets/icon-only.png', await render(icons.app, 1024))
write('assets/icon-foreground.png', await render(icons.foreground, 1024, 1024, { transparent: true }))
write('assets/icon-background.png', await render(icons.background, 1024))
write('assets/splash.png', await render(splash(2732, 2732, PAPER), 2732))
write('assets/splash-dark.png', await render(splash(2732, 2732, NIGHT), 2732))

// ---- Capacitor shells: every existing icon and splash at its own size ----
const ios = 'ios/App/App/Assets.xcassets'
if (fs.existsSync(path.join(ROOT, ios))) {
  for (const f of fs.readdirSync(path.join(ROOT, ios, 'AppIcon.appiconset')).filter((f) => f.endsWith('.png'))) {
    const rel = `${ios}/AppIcon.appiconset/${f}`
    const [w] = pngSize(path.join(ROOT, rel))
    write(rel, await render(icons.app, w))
  }
  for (const f of fs.readdirSync(path.join(ROOT, ios, 'Splash.imageset')).filter((f) => f.startsWith('Default') && f.endsWith('.png'))) {
    const rel = `${ios}/Splash.imageset/${f}`
    const [w, h] = pngSize(path.join(ROOT, rel))
    write(rel, await render(splash(w, h, f.includes('-dark') ? NIGHT : PAPER), w, h))
  }
}
const res = 'android/app/src/main/res'
if (fs.existsSync(path.join(ROOT, res))) {
  for (const dir of fs.readdirSync(path.join(ROOT, res))) {
    for (const f of fs.readdirSync(path.join(ROOT, res, dir)).filter((f) => f.endsWith('.png'))) {
      const rel = `${res}/${dir}/${f}`
      const [w, h] = pngSize(path.join(ROOT, rel))
      const kind = { 'ic_launcher.png': 'legacy', 'ic_launcher_round.png': 'round', 'ic_launcher_foreground.png': 'foreground', 'ic_launcher_background.png': 'background' }[f]
      if (kind) write(rel, await render(icons[kind], w, h, { transparent: kind !== 'background' }))
      else if (f === 'splash.png') write(rel, await render(splash(w, h, dir.includes('night') ? NIGHT : PAPER), w, h))
    }
  }
}

await browser.close()
