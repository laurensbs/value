import { expect, test } from '@playwright/test'
import { shot, signInAdmin } from './helpers'

test('admin: marketing hub with live questions, interview sets, the post planner, share images and campaign links', async ({ browser }) => {
  const admin = await signInAdmin(browser)
  const page = admin.page

  await page.goto('/admin/marketing')
  await expect(page.getByRole('heading', { name: 'Marketinghub', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Deze week', exact: true })).toBeVisible()

  // The best questions: eleven, each with a live answer and a "wat nu".
  const questions = page.locator('.mk-q')
  await expect(questions).toHaveCount(11)
  await expect(questions.first()).toContainText('Waar haken mensen af?')
  await expect(questions.first()).toContainText('Wat nu')
  await expect(page.locator('#q-traffic')).toContainText('Web Analytics')

  // Interview questions: one copy button per set.
  const shelterSet = page.locator('.mk-interview').first()
  await expect(shelterSet).toContainText('Hoe is het wandelen met de honden nu geregeld?')
  await shelterSet.getByRole('button', { name: 'Kopieer vragen' }).click()
  await expect(shelterSet.getByRole('button', { name: 'Gekopieerd' })).toBeVisible()

  // Post planner: texts in four languages, and "Gepost" is saved (never posted by the site itself).
  const planner = page.locator('#posts')
  await planner.getByRole('group', { name: 'Taal van de tekst' }).getByRole('button', { name: 'EN' }).click()
  await expect(planner.locator('.mk-post').first()).toContainText('A dog is waiting for an extra walk')
  await planner.getByRole('group', { name: 'Taal van de tekst' }).getByRole('button', { name: 'NL' }).click()
  // The button changes at once (optimistic); wait until the server action itself has answered.
  const saved = () => page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/admin/marketing')
  const undo = planner.getByRole('button', { name: /^Zet terug op niet gepost: Er wacht een hond/ })
  if (await undo.count()) {
    await Promise.all([saved(), undo.click()])
    await expect(planner.getByRole('button', { name: /^Markeer als gepost: Er wacht een hond/ })).toBeVisible()
  }
  await Promise.all([saved(), planner.getByRole('button', { name: /^Markeer als gepost: Er wacht een hond/ }).click()])
  await expect(planner.getByRole('button', { name: /^Zet terug op niet gepost: Er wacht een hond/ })).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.locator('#posts').getByRole('button', { name: /^Zet terug op niet gepost: Er wacht een hond/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(/Volgende post: Week 1: Ik bouw een gratis app/)).toBeVisible()

  // The share image is a PNG made by the server, also as a download.
  const image = await page.request.get('/admin/marketing/card/p01?lang=es')
  expect(image.status()).toBe(200)
  expect(image.headers()['content-type']).toBe('image/png')
  expect(image.headers()['cache-control']).toContain('private')
  const file = await page.request.get('/admin/marketing/card/p10?lang=nl&download=1')
  expect(file.headers()['content-disposition']).toMatch(/^attachment; filename=".+-p10-nl\.png"$/)
  expect((await page.request.get('/admin/marketing/card/nope')).status()).toBe(404)

  // Campaign links: utm tags, and a sign-up link with a code of its own.
  const links = page.locator('#links')
  await links.getByLabel('Pagina', { exact: true }).selectOption('/dogs')
  await links.getByLabel('Bron', { exact: true }).selectOption('instagram')
  await links.getByLabel('Naam of plek').fill('Bibliotheek Oost')
  await links.getByLabel('Campagne', { exact: true }).fill('Start oktober')
  await expect(links.locator('output').first()).toHaveText(/\/dogs\?utm_source=instagram-bibliotheek-oost&utm_medium=social&utm_campaign=start-oktober$/)
  await expect(links.getByLabel('Code', { exact: true })).toHaveValue('IGBIBLIOTHEE')
  await expect(links.locator('output').nth(1)).toHaveText(/\/r\/IGBIBLIOTHEE$/)
  await links.getByRole('button', { name: 'Aanmeldlink' }).click()
  await expect(links.getByRole('img', { name: /QR-code voor .*\/r\/IGBIBLIOTHEE/ })).toBeVisible()
  await shot(page, '40-admin-marketing')

  await admin.context.close()
})

test('the marketing hub and its images are for admins only', async ({ page }) => {
  await page.goto('/admin/marketing')
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/)
  expect((await page.request.get('/admin/marketing/card/p01')).status()).toBe(404)
})
