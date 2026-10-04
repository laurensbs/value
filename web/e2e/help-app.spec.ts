import { expect, test } from '@playwright/test'
import { newPerson, onboard, shot, signUp, unique } from './helpers'

// The iOS and Android apps add "RondjeApp" to the user agent (capacitor.config.ts).
const APP_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 RondjeApp'
// CROWDFUNDING_URL in playwright.config.ts (fake). SUPPORT_IN_APP=0 hides all of it: src/lib/app-support.test.ts.
const CAMPAIGN = 'https://whydonate.com/nl/fundraising/example'

test('in the app: "Help ons via Whydonate" at the bottom of the profile, one tap straight to the campaign', async ({ browser }) => {
  const { context, page } = await newPerson(browser, undefined, { userAgent: APP_UA })
  await signUp(page, { name: 'Mila', email: `help-app-${unique()}@e2e.test`, intent: 'owner' })
  await onboard(page, { birthDate: '1980-04-04', city: 'Utrecht', bio: 'Ik heb een hond.', phone: '', walker: false, owner: true })

  await page.goto('/profile')
  const row = page.getByRole('main').getByRole('link', { name: /^Help ons via Whydonate/ })
  await expect(row).toBeVisible()
  // Says where it goes and what a round is, and that it leaves the app for the browser.
  await expect(row).toHaveAttribute('href', CAMPAIGN)
  await expect(row).toHaveAttribute('target', '_blank')
  await expect(row).toHaveAttribute('rel', /noopener/)
  await expect(row).toContainText(/Geef een rondje vanaf €\s?5/)
  await expect(row).toHaveAccessibleName(/opent Whydonate in je browser/)
  // Exactly one, and low on the page: the last list of the profile, below privacy, never at the top.
  await expect(page.getByRole('main').getByRole('link', { name: /Whydonate/ })).toHaveCount(1)
  await expect(page.locator('main .hub-list').last()).toContainText('Help ons via Whydonate')
  await expect(page.locator('main .hub-list').first()).not.toContainText('Whydonate')
  const rowTop = (await row.boundingBox())!.y
  expect(rowTop).toBeGreaterThan((await page.getByRole('heading', { name: 'Je gegevens', level: 2 }).boundingBox())!.y)
  // No other way to give money in the app: no /support row, no membership.
  await expect(page.locator('main a[href="/support"]')).toHaveCount(0)
  await expect(page.getByText(/Word lid|lidmaatschap|aftrekbaar/i)).toHaveCount(0)
  await row.scrollIntoViewIfNeeded()
  await shot(page, '50-help-app-profile')

  // One tap opens the campaign itself, no sheet or page in between. (The Capacitor shell opens a
  // link outside rondjemee.nl in Safari or the phone's browser; here it is a new tab.)
  await context.route('https://whydonate.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>Whydonate</title>' }))
  const [campaign] = await Promise.all([context.waitForEvent('page'), row.click()])
  await expect(campaign).toHaveURL(CAMPAIGN)
  await campaign.close()
  await expect(page).toHaveURL(/\/profile$/)

  // The footer's "Help ons" goes straight there too.
  const footer = page.getByRole('contentinfo').getByRole('link', { name: /^Help ons via Whydonate/ })
  await expect(footer).toHaveAttribute('href', CAMPAIGN)
  await expect(footer).toHaveAttribute('target', '_blank')

  // The same person on the website: the profile keeps its link to /support, without the app row.
  const web = await browser.newContext({ storageState: await context.storageState() })
  const site = await web.newPage()
  await site.goto('/profile')
  await expect(site.locator('main a[href="/support"]')).toHaveCount(1)
  await expect(site.getByRole('main').getByRole('link', { name: /Whydonate/ })).toHaveCount(0)
  await expect(site.getByRole('contentinfo').locator('a[href="/support"]')).toHaveCount(1)
  await web.close()
  await context.close()
})

test('the app config: the campaign for the apps next to the old membership field', async ({ request }) => {
  const res = await request.get('/api/v1/config')
  expect(res.status()).toBe(200)
  const body = await res.json()
  // Old app builds read this one: unchanged.
  expect(body.membership).toEqual({ inApp: false, path: '/support' })
  expect(body.support).toMatchObject({
    inApp: true,
    label: 'Help ons via Whydonate',
    crowdfundingUrl: CAMPAIGN,
    platform: 'Whydonate',
    operator: 'Voorbeeld',
  })
  if (body.support.goal !== null) expect(body.support.rounds).toEqual({ goal: body.support.goal / 5, raised: Math.floor(body.support.raised / 5) })
})
