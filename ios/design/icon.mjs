// Renders the app icon (light, dark and tinted) and the wordmark of the welcome screen from the logo
// sources (logo B, "het woordmerk": "rondje mee" with the tennis ball as the dot on the j).
// Run from web/: node ../ios/design/icon.mjs  (uses web/node_modules/playwright; set PW_CHROMIUM_PATH
// to use another Chromium).
//
// - icon-light.svg: the stacked word on forest green, square (iOS rounds the corners itself).
// - icon-dark.svg: the same word on a transparent background; iOS puts its own dark backdrop behind it.
// - icon-tinted.svg: grey and white on transparent; iOS tints it.
// - brand/woordmerk.svg and brand/woordmerk-donker.svg: the wordmark for light and dark mode, written as
//   the vector image "Wordmark" (cropped to the ink, so it lines up with the text around it).
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const assets = join(here, '..', 'Rondje', 'Resources', 'Assets.xcassets')
const out = join(assets, 'AppIcon.appiconset')
mkdirSync(out, { recursive: true })

const variants = {
  'icon-light.png': { svg: 'icon-light.svg', transparent: false },
  'icon-dark.png': { svg: 'icon-dark.svg', transparent: true },
  'icon-tinted.png': { svg: 'icon-tinted.svg', transparent: true },
}

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } })
for (const [name, { svg, transparent }] of Object.entries(variants)) {
  const source = readFileSync(join(here, svg), 'utf8').replace('<svg ', '<svg width="1024" height="1024" style="display:block" ')
  await page.setContent(`<html><body style="margin:0;background:transparent">${source}</body></html>`)
  await page.screenshot({ path: join(out, name), omitBackground: transparent, clip: { x: 0, y: 0, width: 1024, height: 1024 } })
}
await browser.close()

writeFileSync(join(out, 'Contents.json'), JSON.stringify({
  images: [
    { filename: 'icon-light.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
    { appearances: [{ appearance: 'luminosity', value: 'dark' }], filename: 'icon-dark.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
    { appearances: [{ appearance: 'luminosity', value: 'tinted' }], filename: 'icon-tinted.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
  ],
  info: { author: 'xcode', version: 1 },
}, null, 2))
console.log('icons written to', out)

// The wordmark as a vector image set, cropped to the ink (x 3.5-433.9, y -81.1-15.3, plus 1 unit).
const crop = { x: 2.5, y: -82.13, w: 432.39, h: 98.43 }
const wordmark = join(assets, 'Wordmark.imageset')
mkdirSync(wordmark, { recursive: true })
for (const [file, target] of [['woordmerk.svg', 'wordmark.svg'], ['woordmerk-donker.svg', 'wordmark-dark.svg']]) {
  const body = readFileSync(join(here, 'brand', file), 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  writeFileSync(join(wordmark, target), `<svg xmlns="http://www.w3.org/2000/svg" width="${crop.w}" height="${crop.h}" viewBox="0 0 ${crop.w} ${crop.h}"><g transform="translate(${-crop.x} ${-crop.y})">${body}</g></svg>\n`)
}
writeFileSync(join(wordmark, 'Contents.json'), JSON.stringify({
  images: [
    { filename: 'wordmark.svg', idiom: 'universal' },
    { appearances: [{ appearance: 'luminosity', value: 'dark' }], filename: 'wordmark-dark.svg', idiom: 'universal' },
  ],
  info: { author: 'xcode', version: 1 },
  properties: { 'preserves-vector-representation': true },
}, null, 2))
console.log('wordmark written to', wordmark)
