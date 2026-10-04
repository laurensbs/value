import { expect, test } from '@playwright/test'
import { newPerson, onboard, shot, signInAdmin, signUp, unique } from './helpers'

test('tips: vote for a directory shelter, suggest a new one, admin follows up', async ({ browser }) => {
  const id = unique()
  const walker = await newPerson(browser)
  await signUp(walker.page, { name: 'Noor', email: `noor-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2001-05-05', city: 'Utrecht', bio: 'Ik wil graag helpen bij een opvang.', phone: '06 1234 5678', walker: true, owner: false })

  // "I want to walk here" on a shelter from the directory: one vote per person.
  await walker.page.goto('/shelters?country=NL')
  await walker.page.getByRole('button', { name: /Ik wil hier wandelen/ }).first().click()
  await expect(walker.page.getByRole('button', { name: /Je stem telt/ }).first()).toBeVisible()
  await shot(walker.page, '26-directory-vote')

  // A tip with someone's phone number is refused; without it, it is accepted.
  await walker.page.goto('/suggest')
  const shelterName = `Hondenhuis Test ${id}`
  await walker.page.getByLabel('Naam van de opvang').fill(shelterName)
  await walker.page.getByLabel('Plaats').fill('Zeist')
  await walker.page.getByLabel(/Waarom deze opvang/).fill('Bel Kees op 06 12345678')
  await walker.page.getByRole('button', { name: 'Tip versturen' }).click()
  await expect(walker.page.getByText(/Laat telefoonnummers/)).toBeVisible()
  await walker.page.getByLabel(/Waarom deze opvang/).fill('De honden komen weinig buiten.')
  await walker.page.getByRole('button', { name: 'Tip versturen' }).click()
  await expect(walker.page.getByText(/Bedankt voor je tip/)).toBeVisible()
  await shot(walker.page, '27-suggest')

  // Someone with a dog: only advice and the walker's own invite link, nothing is stored.
  await walker.page.goto('/suggest?kind=owner')
  await expect(walker.page.getByText(/Vraag het eerst zelf/)).toBeVisible()
  await expect(walker.page.locator('input[name=name]')).toHaveCount(0)
  await expect(walker.page.locator('#invite-url')).toHaveValue(/\/r\/[A-Z0-9]+\?intent=owner$/)

  // The admin sees the tip and marks it as contacted.
  const admin = await signInAdmin(browser)
  await admin.page.goto('/admin/numbers')
  await expect(admin.page.getByRole('heading', { name: 'Groei' })).toBeVisible()
  await expect(admin.page.getByText('Rondjes van vaste koppels, deze week')).toBeVisible()
  // From the admin home, the tips tile leads to the tips.
  await admin.page.goto('/admin')
  await admin.page.locator('.admin-tiles').getByRole('link', { name: /^Tips en stemmen/ }).click()
  await expect(admin.page).toHaveURL(/\/admin\/tips$/)
  const row = admin.page.getByRole('listitem').filter({ hasText: shelterName })
  await expect(row.getByText('De honden komen weinig buiten.')).toBeVisible()
  await row.getByRole('button', { name: 'Benaderd' }).click()
  await expect(row.getByText(/al benaderd/)).toBeVisible()
  await shot(admin.page, '28-admin-tips')

  for (const p of [walker, admin]) await p.context.close()
})
