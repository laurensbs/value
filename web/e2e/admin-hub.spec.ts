import { expect, test } from '@playwright/test'
import { newPerson, onboard, signInAdmin, signUp, unique } from './helpers'

test('admin hub: tiles with live counts, the best questions, every section and one app manifest', async ({ browser }) => {
  // A shelter that waits for verification, so at least one question asks for attention.
  const id = unique()
  const staff = await newPerson(browser)
  await signUp(staff.page, { name: 'Ruud', email: `ruud-${id}@e2e.test`, intent: 'shelter' })
  await onboard(staff.page, { birthDate: '1980-06-06', city: 'Utrecht', bio: 'Vrijwilligerscoördinator.', phone: '', walker: false, owner: false })
  await staff.page.goto('/shelter')
  await staff.page.getByLabel('Naam van de opvang').fill(`Hub Opvang ${id}`)
  await staff.page.getByLabel('Plaats').fill('Utrecht')
  await staff.page.getByLabel(/KvK-, KBO- of CIF-nummer/).fill('11223344')
  await staff.page.getByLabel(/Ik mag deze opvang vertegenwoordigen/).check()
  await staff.page.getByRole('button', { name: 'Opvang aanmelden' }).click()
  await expect(staff.page).toHaveURL(/\/shelter\/[^/]+\?created=1/)

  const admin = await signInAdmin(browser)
  const page = admin.page
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Beheer', level: 1 })).toBeVisible()

  // The section switch, with Overzicht as the current page.
  const nav = page.getByRole('navigation', { name: 'Onderdelen van Beheer' })
  for (const name of ['Overzicht', 'Lancering', 'Marketing', 'Moderatie', 'Opvangen', 'Tips', 'Cijfers']) await expect(nav.getByRole('link', { name })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Overzicht' })).toHaveAttribute('aria-current', 'page')

  // Six tiles, with live counts.
  const tiles = page.getByRole('navigation', { name: 'Naar een onderdeel' }).getByRole('link')
  await expect(tiles).toHaveCount(6)
  await expect(tiles.filter({ hasText: 'Opvangen' })).toContainText(/\d+ wacht(en)? op verificatie/)
  await expect(tiles.filter({ hasText: 'Marketing' })).toHaveAttribute('href', '/admin/marketing')

  // The best questions: all nine answered, each with a link; the waiting shelter asks for attention.
  const questions = page.locator('.admin-questions > li')
  await expect(questions).toHaveCount(9)
  const shelters = questions.filter({ hasText: 'Welke opvangen wachten op verificatie?' })
  await expect(shelters).toContainText(/wacht(en)? op verificatie/)
  await expect(shelters.getByRole('link', { name: /Verifieer opvangen/ })).toHaveAttribute('href', '/admin/shelters')
  await expect(page.getByRole('status').filter({ hasText: /aandacht/ })).toBeVisible()
  await expect(questions.filter({ hasText: 'Zijn de database en de dagelijkse opruimronde gezond?' })).toContainText(/antwoordt in \d+ ms/)

  // Every section opens under the same layout, with its own address after signing in.
  for (const [link, path, heading] of [
    ['Moderatie', '/admin/moderation', 'Moderatie'],
    ['Opvangen', '/admin/shelters', 'Opvangen'],
    ['Tips', '/admin/tips', 'Tips en stemmen'],
    ['Cijfers', '/admin/numbers', 'Cijfers'],
  ] as const) {
    await nav.getByRole('link', { name: link }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible()
    await expect(nav.getByRole('link', { name: link })).toHaveAttribute('aria-current', 'page')
  }
  await nav.getByRole('link', { name: 'Opvangen' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: `Hub Opvang ${id}` })).toBeVisible()

  // One manifest for all of Beheer, opening on /admin.
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/admin/manifest.webmanifest')
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'Beheer')
  const manifest = await (await page.request.get('/admin/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ id: '/admin', name: 'Beheer', start_url: '/admin', scope: '/admin', display: 'standalone' })

  // Not for anyone else: a signed-in member goes home, a visitor to the login for that exact page.
  await staff.page.goto('/admin/moderation')
  await expect(staff.page).toHaveURL(/\/$/)
  const visitor = await newPerson(browser)
  await visitor.page.goto('/admin/numbers')
  await expect(visitor.page).toHaveURL(/\/login\?next=%2Fadmin%2Fnumbers$/)

  for (const p of [staff, admin, visitor]) await p.context.close()
})
