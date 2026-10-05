import { expect, test } from '@playwright/test'
import { addDog, newPerson, onboard, shot, signInAdmin, signUp, unique } from './helpers'

// The iOS and Android apps add "RondjeApp" to the user agent (capacitor.config.ts).
const APP_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 RondjeApp'

test('Bronnen: the admin sees sign-ups per week, source and role, only as counts; nobody else gets in', async ({ browser }) => {
  test.setTimeout(180_000)
  const id = unique()
  // A campaign code of its own, so the counts of other tests on this server never mix in.
  const code = `E2E${id.toUpperCase()}`

  // Someone with a dog comes in through the campaign link and puts the dog online.
  const owner = await newPerson(browser)
  await owner.page.goto(`/r/${code}?intent=owner`)
  await expect(owner.page).toHaveURL(/\/signup\?intent=owner$/)
  await signUp(owner.page, { name: 'Mila', email: `mila-${id}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1990-04-04', city: 'Utrecht', bio: 'Mijn hond houdt van lange rondjes.', phone: '', walker: false, owner: true })
  await addDog(owner.page, `Bram ${id}`)

  const admin = await signInAdmin(browser)
  const page = admin.page
  await page.goto('/admin/sources')
  await expect(page.getByRole('heading', { name: 'Bronnen', level: 1 })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Onderdelen van Beheer' }).getByRole('link', { name: 'Bronnen' })).toHaveAttribute('aria-current', 'page')

  // Per week: the last eight ISO weeks, this week on top, with the roles and the new real dogs.
  const weeks = page.getByRole('table', { name: 'Aanmeldingen per week' })
  await expect(weeks.getByRole('columnheader')).toHaveText(['Week', 'Totaal', 'Wandelaar', 'Eigenaar', 'Opvang', 'Nieuwe honden'])
  await expect(weeks.locator('tbody tr')).toHaveCount(8)
  const thisWeek = weeks.locator('tbody tr').first()
  await expect(thisWeek.getByRole('rowheader')).toContainText(/^Week \d{1,2}/)
  const [total, , owners, , dogs] = (await thisWeek.getByRole('cell').allTextContents()).map(Number)
  expect(total).toBeGreaterThanOrEqual(1)
  expect(owners).toBeGreaterThanOrEqual(1)
  expect(dogs).toBeGreaterThanOrEqual(1)

  // Per source: the campaign code with exactly one dog owner.
  const sources = page.getByRole('table', { name: 'Per bron, 8 weken samen' })
  await expect(sources.getByRole('row', { name: new RegExp(code) }).getByRole('cell')).toHaveText(['0', '1', '0', '1'])

  // Per week and source, folded away until asked for.
  const detail = page.getByRole('table', { name: 'Per week en bron' })
  await expect(detail).toBeHidden()
  await page.locator('summary', { hasText: 'Per week en bron' }).click()
  await expect(detail.getByRole('row', { name: new RegExp(code) }).getByRole('cell')).toHaveText(['0', '1', '0', '1'])

  // Only counts: no name, e-mail address or dog of the person on the page.
  const main = page.getByRole('main')
  for (const secret of ['Mila', `mila-${id}`, `Bram ${id}`]) await expect(main).not.toContainText(secret)

  // The crowdfunding as it stands in content/crowdfunding.json, and how to update it.
  await expect(page.getByRole('progressbar', { name: 'Inzamelactie' })).toBeVisible()
  await expect(page.getByText(/€\s?\d[\d.]* van €\s?3\.000/)).toBeVisible()
  await expect(page.getByText('Zo werk je het bedrag bij')).toBeVisible()
  await expect(page.locator('code', { hasText: 'web/content/crowdfunding.json' })).toBeVisible()

  await shot(page, 'admin-sources')

  // Calm on a phone, also a small one (375 px): every column of the week table fits, nothing scrolls sideways.
  for (const width of [412, 375]) {
    await page.setViewportSize({ width, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `page at ${width}px`).toBe(true)
    expect(await weeks.evaluate((table) => table.parentElement!.scrollWidth <= table.parentElement!.clientWidth), `week table at ${width}px`).toBe(true)
  }
  await shot(page, 'admin-sources-375')

  // The app shell never shows money, also not to an admin.
  const appContext = await browser.newContext({ userAgent: APP_UA, storageState: await admin.context.storageState() })
  const app = await appContext.newPage()
  await app.goto('/admin/sources')
  await expect(app.getByRole('heading', { name: 'Bronnen', level: 1 })).toBeVisible()
  await expect(app.getByRole('heading', { name: 'Inzamelactie' })).toHaveCount(0)
  await expect(app.getByRole('main')).not.toContainText('€')

  // Not for anyone else: a signed-in member goes home, a visitor to the login for this exact page.
  await owner.page.goto('/admin/sources')
  await expect(owner.page).toHaveURL(/\/$/)
  const visitor = await newPerson(browser)
  await visitor.page.goto('/admin/sources')
  await expect(visitor.page).toHaveURL(/\/login\?next=%2Fadmin%2Fsources$/)

  for (const context of [owner.context, admin.context, appContext, visitor.context]) await context.close()
})
