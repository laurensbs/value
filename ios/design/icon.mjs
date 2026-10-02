// Renders the app icon (light, dark and tinted) from SVG with headless Chromium.
// Run from web/: node ../ios/design/icon.mjs  (uses web/node_modules/playwright)
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, '..', 'Rondje', 'Resources', 'Assets.xcassets', 'AppIcon.appiconset')
mkdirSync(out, { recursive: true })

// The dog's face inside the walking loop: the brand mark of the website, made friendlier.
function face(fur, ears, muzzle, ink) {
  return `
  <g transform="translate(512 552) scale(4.3) translate(-60 -62)">
    <ellipse cx="31" cy="62" rx="11" ry="24" transform="rotate(14 31 62)" fill="${ears}"/>
    <ellipse cx="89" cy="62" rx="11" ry="24" transform="rotate(-14 89 62)" fill="${ears}"/>
    <ellipse cx="60" cy="62" rx="34" ry="32" fill="${fur}"/>
    <ellipse cx="31" cy="62" rx="11" ry="24" transform="rotate(14 31 62)" fill="${ears}"/>
    <ellipse cx="89" cy="62" rx="11" ry="24" transform="rotate(-14 89 62)" fill="${ears}"/>
    <circle cx="47" cy="57" r="4.6" fill="${ink}"/><circle cx="73" cy="57" r="4.6" fill="${ink}"/>
    <circle cx="48.6" cy="55.5" r="1.5" fill="#fff"/><circle cx="74.6" cy="55.5" r="1.5" fill="#fff"/>
    <ellipse cx="60" cy="76" rx="18" ry="14" fill="${muzzle}"/>
    <path d="M55.5 80.5 q4.5 11 9 0 z" fill="#e8798a"/>
    <ellipse cx="60" cy="70" rx="7" ry="5" fill="${ink}"/>
    <path d="M60 75 v4 M60 79 q-5 4 -9 1 M60 79 q5 4 9 1" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>
  </g>`
}

function icon({ bg1, bg2, loop, ball, fur, ears, muzzle, ink, transparent = false }) {
  const background = transparent
    ? ''
    : `<defs><radialGradient id="g" cx="30%" cy="20%" r="95%"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></radialGradient></defs>
       <rect width="1024" height="1024" fill="url(#g)"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    ${background}
    <circle cx="512" cy="540" r="300" fill="none" stroke="${loop}" stroke-width="62" stroke-linecap="round" stroke-dasharray="76 112.5" transform="rotate(-97.3 512 540)"/>
    ${face(fur, ears, muzzle, ink)}
    <circle cx="512" cy="240" r="78" fill="${ball}"/>
    <path d="M452 214 q60 34 120 0" fill="none" stroke="#000" stroke-opacity="0.16" stroke-width="9" stroke-linecap="round"/>
  </svg>`
}

const variants = {
  'icon-light.png': icon({ bg1: '#2c7a52', bg2: '#163f2b', loop: '#d9f05a', ball: '#d9f05a', fur: '#e2b45c', ears: '#c99540', muzzle: '#f5dfb5', ink: '#1d2421' }),
  'icon-dark.png': icon({ bg1: '#0f2a1d', bg2: '#06120c', loop: '#d9f05a', ball: '#d9f05a', fur: '#e2b45c', ears: '#c99540', muzzle: '#f5dfb5', ink: '#1d2421', transparent: true }),
  'icon-tinted.png': icon({ bg1: '#000', bg2: '#000', loop: '#bdbdbd', ball: '#ffffff', fur: '#e6e6e6', ears: '#9a9a9a', muzzle: '#ffffff', ink: '#2a2a2a', transparent: true }),
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } })
for (const [name, svg] of Object.entries(variants)) {
  writeFileSync(join(here, name.replace('.png', '.svg')), svg)
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
  await page.locator('svg').screenshot({ path: join(out, name), omitBackground: name !== 'icon-light.png' })
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
