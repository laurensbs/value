import { expect, test } from '@playwright/test'
import { newPerson, signInAdmin, unique } from './helpers'

test('admin: launch hub with the waiting tasks, a ticked-off task, a contact and a mail ready to send', async ({ browser }) => {
  const admin = await signInAdmin(browser)
  const page = admin.page

  // On a phone the header has no menu: the profile leads to Beheer.
  await page.goto('/profile')
  await page.getByRole('link', { name: /^Beheer Meldingen/ }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.locator('.admin-tiles').getByRole('link', { name: /^Lancering/ }).click()
  await expect(page).toHaveURL(/\/admin\/launch$/)
  await expect(page.getByRole('heading', { name: 'Lanceerhub', level: 1 })).toBeVisible()

  // Exactly four tasks wait for Laurens, the name first.
  const waiting = page.getByRole('list', { name: 'Wacht op Laurens' })
  await expect(waiting.getByRole('listitem')).toHaveCount(4)
  await expect(waiting.getByRole('listitem').first()).toContainText('Naam gekozen: Rondje Mee')

  // Ticking a task off is saved (on a reused server it may already be done: reopen it first).
  const reopen = page.getByRole('button', { name: 'Zet terug op open: Merkcheck op TMview' })
  if (await reopen.count()) {
    await reopen.click()
    await page.reload()
  }
  await page.getByRole('button', { name: 'Markeer als gedaan: Merkcheck op TMview' }).click()
  await expect(page.getByRole('button', { name: 'Zet terug op open: Merkcheck op TMview' })).toBeVisible()
  await page.reload()
  // Done tasks move to the folded "Afgerond" list at the end.
  await page.getByText(/Afgerond \(\d+\)/).click()
  await expect(page.getByRole('button', { name: 'Zet terug op open: Merkcheck op TMview' })).toBeVisible()

  // A test contact, only in the database.
  const org = `Opvang E2E ${unique()}`
  const email = `opvang-${unique()}@rondje.test`
  await page.getByRole('button', { name: 'Contact toevoegen' }).click()
  const form = page.locator('.launch-contact-form')
  await form.getByLabel('Naam', { exact: true }).fill('Sanne')
  await form.getByLabel('Organisatie').fill(org)
  await form.getByLabel('E-mailadres').fill(email)
  await form.getByLabel('Stad').fill('Utrecht')
  await form.getByRole('button', { name: 'Contact toevoegen' }).click()
  const card = page.locator('.launch-contact').filter({ hasText: org })
  await expect(card).toBeVisible()

  // "Schrijf bericht" fills in the first shelter mail; "Open in mail" is a mailto: link (never sent by Rondje).
  await card.getByRole('button', { name: 'Schrijf bericht' }).click()
  const mail = page.getByRole('link', { name: 'Open in mail' })
  await expect(mail).toHaveAttribute('href', new RegExp(`^mailto:${email.replace('.', '\\.')}\\?subject=Extra%20wandelingen`))
  await expect(mail).toHaveAttribute('href', new RegExp(`body=Beste%20Sanne%2C%0D%0A`))
  await expect(page.locator('.launch-preview')).toContainText(`samenwerken met ${org}`)

  // Status only changes by the admin's own click.
  await card.getByRole('button', { name: 'Verstuurd' }).click()
  await expect(card.getByRole('button', { name: 'Verstuurd' })).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(page.locator('.launch-contact').filter({ hasText: org }).getByRole('button', { name: 'Verstuurd' })).toHaveAttribute('aria-pressed', 'true')

  // No manifest of its own any more: the whole of Beheer is one home-screen app.
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/admin/manifest.webmanifest')
  expect((await page.request.get('/admin/launch/manifest.webmanifest')).status()).toBe(404)

  await admin.context.close()
})

test('launch hub: import contacts from a CSV, with a preview that skips duplicates and mistakes', async ({ browser }) => {
  const admin = await signInAdmin(browser)
  const page = admin.page
  const id = unique()
  await page.goto('/admin/launch')
  await page.getByRole('button', { name: 'Importeer CSV' }).click()
  const panel = page.locator('.launch-import')
  await panel.getByLabel('CSV plakken').fill(
    [
      'audience,organisation,name,email,phone,city,note',
      `shelter,Opvang Import ${id},Sanne,sanne-${id}@rondje.test,,Utrecht,`,
      `dierenarts,Kliniek Import ${id},,kliniek-${id}@rondje.test,,Zeist,`,
      `shelter,opvang import ${id},Sanne,SANNE-${id}@rondje.test,,Utrecht,dubbel`,
      `bakker,Bakkerij ${id},,,,Zeist,`,
      `press,Krant ${id},,geen-adres,,Utrecht,`,
    ].join('\n'),
  )
  await panel.getByRole('button', { name: 'Bekijk voorbeeld' }).click()
  await expect(panel.getByText('2 nieuw')).toBeVisible()
  await expect(panel.getByText('1 dubbel')).toBeVisible()
  await expect(panel.getByText('2 met een fout')).toBeVisible()
  const rows = panel.getByRole('list', { name: 'Contacten in het bestand' }).getByRole('listitem')
  await expect(rows).toHaveCount(5)
  await expect(rows.nth(2)).toContainText('Dubbel in bestand')
  await expect(rows.nth(3)).toContainText('Onbekende doelgroep')
  await expect(rows.nth(4)).toContainText('E-mailadres klopt niet')

  await panel.getByRole('button', { name: 'Importeer 2 contacten' }).click()
  await expect(panel.getByText(/2 contacten toegevoegd als ‘te sturen’/)).toBeVisible()
  const card = page.locator('.launch-contact').filter({ hasText: `Kliniek Import ${id}` })
  await expect(card).toBeVisible()
  await expect(card.getByRole('button', { name: 'Te sturen' })).toHaveAttribute('aria-pressed', 'true')

  // The same file again: everything is already there.
  await panel.getByLabel('CSV plakken').fill(`audience,organisation,email\nshelter,Opvang Import ${id},sanne-${id}@rondje.test`)
  await panel.getByRole('button', { name: 'Bekijk voorbeeld' }).click()
  await expect(panel.getByText('Staat er al')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Niets nieuws om te importeren' })).toBeDisabled()

  await admin.context.close()
})

test('the launch hub is for admins only, and signing in leads back to it', async ({ browser }) => {
  // Make sure the admin account exists (also when this test runs on its own).
  const admin = await signInAdmin(browser)
  await admin.context.close()

  const visitor = await newPerson(browser)
  await visitor.page.goto('/admin/launch')
  await expect(visitor.page).toHaveURL(/\/login\?next=%2Fadmin%2Flaunch$/)
  await visitor.page.getByLabel('E-mailadres').fill('admin@e2e.test')
  await visitor.page.getByLabel('Wachtwoord').fill('wandelen-123')
  await visitor.page.getByRole('button', { name: 'Inloggen', exact: true }).click()
  await visitor.page.waitForURL((url) => url.pathname === '/admin/launch')
  await expect(visitor.page.getByRole('heading', { name: 'Lanceerhub', level: 1 })).toBeVisible()
  await visitor.context.close()
})
