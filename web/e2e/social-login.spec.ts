import { expect, test, type Page } from '@playwright/test'
import { shot } from './helpers'

// Runs with fake Google and Apple clients (playwright.config.ts). On the real site the buttons
// appear as soon as the keys are in Vercel (docs/LAUNCH.md §5); without keys they stay away.

const APP_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 RondjeApp'

async function socialButtons(page: Page) {
  const apple = page.getByRole('button', { name: 'Doorgaan met Apple' })
  const google = page.getByRole('button', { name: 'Doorgaan met Google' })
  await expect(apple).toBeVisible()
  await expect(google).toBeVisible()
  // Apple first: Apple asks for its button to be at least as prominent as the others.
  expect((await apple.boundingBox())!.y).toBeLessThan((await google.boundingBox())!.y)
  // Above the e-mail form, as the quicker way in.
  expect((await google.boundingBox())!.y).toBeLessThan((await page.getByLabel('E-mailadres').boundingBox())!.y)
  return { apple, google }
}

/** Stops the browser at Google's or Apple's door and returns the address it was sent to. */
async function leavesFor(page: Page, host: string, click: () => Promise<void>): Promise<URL> {
  await page.route(`https://${host}/**`, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<p>stop</p>' }))
  const [request] = await Promise.all([page.waitForRequest((r) => new URL(r.url()).host === host), click()])
  return new URL(request.url())
}

test('"Welkom terug" and "Maak een account": Apple and Google on the website', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Welkom terug', level: 1 })).toBeVisible()
  await socialButtons(page)
  await expect(page.getByText('of met je e-mailadres')).toBeVisible()
  await shot(page, '60-login-apple-google')

  await page.goto('/signup?intent=walker')
  await expect(page.getByRole('heading', { name: 'Maak een account', level: 1 })).toBeVisible()
  await socialButtons(page)
  await shot(page, '61-signup-apple-google')
})

test('Google: straight to Google with our client, and back to Rondje Mee', async ({ page }) => {
  await page.goto('/login')
  const { google } = await socialButtons(page)
  const url = await leavesFor(page, 'accounts.google.com', () => google.click())
  expect(url.searchParams.get('client_id')).toBe('e2e-client.apps.googleusercontent.com')
  expect(url.searchParams.get('response_type')).toBe('code')
  expect(url.searchParams.get('redirect_uri')).toMatch(/\/api\/auth\/callback\/google$/)
  expect(url.searchParams.get('scope')?.split(' ')).toEqual(expect.arrayContaining(['openid', 'email', 'profile']))
  expect(url.searchParams.get('state')).toBeTruthy()
})

test('Apple: straight to Apple with our Services ID, answering by form post', async ({ page }) => {
  await page.goto('/signup')
  const { apple } = await socialButtons(page)
  const url = await leavesFor(page, 'appleid.apple.com', () => apple.click())
  expect(url.pathname).toBe('/auth/authorize')
  expect(url.searchParams.get('client_id')).toBe('app.rondje.e2e')
  expect(url.searchParams.get('response_mode')).toBe('form_post')
  expect(url.searchParams.get('redirect_uri')).toMatch(/\/api\/auth\/callback\/apple$/)
  expect(url.searchParams.get('state')).toBeTruthy()
})

test('the app shell keeps e-mail and password (Google refuses sign-in in web views)', async ({ browser }) => {
  const app = await browser.newContext({ userAgent: APP_UA })
  const page = await app.newPage()
  for (const path of ['/login', '/signup']) {
    await page.goto(path)
    await expect(page.getByLabel('E-mailadres')).toBeVisible()
    await expect(page.getByRole('button', { name: /Doorgaan met (Apple|Google)/ })).toHaveCount(0)
  }
  await app.close()
})
