// Renders the source images for app icons and splash screens; then run
// `npx @capacitor/assets generate` to produce every size for iOS and Android.
import { chromium } from '@playwright/test'

const GREEN = '#1f5a3d'
const BALL = '#d9f05a'
const mark = (size, withTile) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
    ${withTile ? `<rect width="64" height="64" fill="${GREEN}"/>` : ''}
    <circle cx="32" cy="32" r="14" fill="none" stroke="${BALL}" stroke-width="5" stroke-dasharray="4 7" stroke-linecap="round"/>
    <circle cx="32" cy="18" r="5.5" fill="${BALL}"/>
  </svg>`

const jobs = [
  // iOS masks the corners itself; no transparency allowed.
  { file: 'assets/icon-only.png', size: 1024, html: mark(1024, true) },
  // Android adaptive icon: the mark sits in the safe zone (inner ~66%).
  { file: 'assets/icon-foreground.png', size: 1024, transparent: true, html: `<div style="width:1024px;height:1024px;display:grid;place-items:center">${mark(620, false)}</div>` },
  { file: 'assets/icon-background.png', size: 1024, html: `<div style="width:1024px;height:1024px;background:${GREEN}"></div>` },
  ...[
    ['assets/splash.png', '#f4f6f0'],
    ['assets/splash-dark.png', '#0d1310'],
  ].map(([file, bg]) => ({
    file,
    size: 2732,
    html: `<div style="width:2732px;height:2732px;background:${bg};display:grid;place-items:center">
      <div style="width:520px;height:520px;border-radius:146px;overflow:hidden">${mark(520, true)}</div></div>`,
  })),
]

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined })
for (const job of jobs) {
  const page = await browser.newPage({ viewport: { width: job.size, height: job.size } })
  await page.setContent(`<html><body style="margin:0;background:transparent">${job.html}</body></html>`)
  await page.screenshot({ path: job.file, omitBackground: Boolean(job.transparent), clip: { x: 0, y: 0, width: job.size, height: job.size } })
  await page.close()
  console.log('wrote', job.file)
}
await browser.close()
