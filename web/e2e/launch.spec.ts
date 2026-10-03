import { expect, test } from '@playwright/test'
import { signInAdmin, unique } from './helpers'

test('admin: launch hub with the waiting tasks, a ticked-off task, a contact and a mail ready to send', async ({ browser }) => {
  const admin = await signInAdmin(browser)
  const page = admin.page

  // On a phone the header has no menu: the profile leads to Beheer.
  await page.goto('/profile')
  await page.getByRole('link', { name: /^Beheer Meldingen/ }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await page.getByRole('link', { name: /Lanceerhub/ }).click()
  await expect(page).toHaveURL(/\/admin\/launch$/)
  await expect(page.getByRole('heading', { name: 'Lanceerhub', level: 1 })).toBeVisible()

  // Exactly four tasks wait for Laurens, the name first.
  const waiting = page.getByRole('list', { name: 'Wacht op Laurens' })
  await expect(waiting.getByRole('listitem')).toHaveCount(4)
  await expect(waiting.getByRole('listitem').first()).toContainText('Woofmigo')

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

  // Its own manifest, so "Zet op beginscherm" opens the hub as an app.
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/admin/launch/manifest.webmanifest')
  const manifest = await (await page.request.get('/admin/launch/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'Lanceerhub', start_url: '/admin/launch', scope: '/admin/launch', display: 'standalone' })

  await admin.context.close()
})

test('the launch hub is for admins only', async ({ page }) => {
  await page.goto('/admin/launch')
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin/)
})
