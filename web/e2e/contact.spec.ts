import { expect, test } from '@playwright/test'
import { newPerson } from './helpers'

// The test server runs with CONTACT_EMAIL=contact@example.org (playwright.config.ts).
const EMAIL = 'contact@example.org'

test('contact: one address from CONTACT_EMAIL, on /contact and in the legal texts, never rondje.app', async ({ browser }) => {
  const { context, page } = await newPerson(browser)

  await page.goto('/contact')
  await expect(page.getByRole('heading', { name: 'Zo bereik je ons', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: EMAIL })).toHaveAttribute('href', `mailto:${EMAIL}`)
  await expect(page.getByRole('link', { name: /Bij direct gevaar bel je 112/ })).toHaveAttribute('href', 'tel:112')
  expect(await page.content()).not.toContain('rondje.app')

  for (const doc of ['privacy', 'terms', 'safety', 'shelters', 'cookies']) {
    await page.goto(`/legal/${doc}`)
    const article = page.locator('article')
    await expect(article.locator(`a[href="mailto:${EMAIL}"]`).first()).toBeVisible()
    await expect(article).not.toContainText('{{contact}}')
    expect(await page.content(), doc).not.toContain('rondje.app')
  }

  // Reachable from the help page and the footer, and listed for search engines.
  await page.goto('/help')
  await page.getByRole('link', { name: 'Zo bereik je ons' }).click()
  await expect(page).toHaveURL(/\/contact$/)
  await expect(page.locator('footer').getByRole('link', { name: 'Contact', exact: true })).toHaveAttribute('href', '/contact')
  expect(await (await page.request.get('/sitemap.xml')).text()).toContain('/contact')
  await context.close()
})
