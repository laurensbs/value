import { expect, test } from '@playwright/test'
import { newPerson, shot } from './helpers'

test('offline: Rondje shows its own page, and carries on once the connection is back', async ({ browser }) => {
  const { context, page } = await newPerson(browser)
  await page.goto('/')
  // The worker registers once the page has settled, and from then on it sees every page load.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 20_000 })

  await context.setOffline(true)
  await page.goto('/dogs').catch(() => {})
  await expect(page.getByRole('heading', { name: 'Geen verbinding', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Probeer opnieuw' })).toBeVisible()
  await expect(page.getByRole('link', { name: '112' })).toHaveAttribute('href', 'tel:112')
  await shot(page, '32-offline')

  // Back online, the page they asked for loads by itself.
  await context.setOffline(false)
  await expect(page.getByRole('heading', { name: 'Honden die op een rondje wachten', level: 1 })).toBeVisible()
  await context.close()
})
