import { expect, test } from '@playwright/test'
import { newPerson, onboard, shot, signInAdmin, signUp, unique } from './helpers'

test('growth loop: a vote brings the shelter, and the voter hears when it joins and plans a walk', async ({ browser }) => {
  const id = unique()

  // A walker asks for a shelter from the directory.
  const walker = await newPerson(browser)
  await signUp(walker.page, { name: 'Lotte', email: `lotte-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2000-03-03', city: 'Utrecht', bio: 'Ik wil graag bij een opvang wandelen.', phone: '06 2222 3333', walker: true, owner: false })
  await walker.page.goto('/shelters?country=NL')
  const first = walker.page.getByRole('listitem').filter({ has: walker.page.getByRole('button', { name: /Ik wil hier wandelen/ }) }).first()
  const shelterName = (await first.locator('strong').first().innerText()).trim()
  const claimHref = await first.getByRole('link', { name: 'Dit is mijn opvang' }).getAttribute('href')
  // Pin the row by its name: after voting, its button text changes.
  const entry = walker.page.getByRole('listitem').filter({ has: walker.page.getByText(shelterName, { exact: true }) })
  await entry.getByRole('button', { name: /Ik wil hier wandelen/ }).click()
  await expect(entry.getByRole('button', { name: /Je stem telt/ })).toBeVisible()

  // The shelter signs up through its own claim link (details already filled in).
  const staff = await newPerson(browser)
  await signUp(staff.page, { name: 'Ruud', email: `ruud-${id}@e2e.test`, intent: 'shelter' })
  await onboard(staff.page, { birthDate: '1980-06-06', city: 'Utrecht', bio: 'Vrijwilligerscoördinator.', phone: '030 765 4321', walker: false, owner: false })
  await staff.page.goto(claimHref!)
  await expect(staff.page.getByLabel('Naam van de opvang')).toHaveValue(shelterName)
  await staff.page.getByLabel(/KvK-, KBO- of CIF-nummer/).fill('87654321')
  await staff.page.getByLabel(/Ik mag deze opvang vertegenwoordigen/).check()
  await staff.page.getByRole('button', { name: 'Opvang aanmelden' }).click()
  await expect(staff.page).toHaveURL(/\/shelter\/[^/]+\?created=1/)
  const shelterPath = new URL(staff.page.url()).pathname

  // The admin verifies it; the walker who asked for it gets a notification.
  const admin = await signInAdmin(browser)
  await admin.page.goto('/admin')
  await admin.page.getByRole('listitem').filter({ hasText: '87654321' }).getByRole('button', { name: 'Verifiëren' }).click()
  await expect(admin.page.getByText('87654321')).toHaveCount(0)

  // The shelter plans a group walk; the walker hears about that too.
  await staff.page.goto(shelterPath)
  await staff.page.getByLabel('Verzamelpunt').fill('Bij de poort')
  await staff.page.getByRole('button', { name: 'Groepswandeling plannen' }).click()
  await expect(staff.page.getByText('Groepswandeling gepland.')).toBeVisible()

  await walker.page.goto('/notifications')
  await expect(walker.page.getByText(`${shelterName} staat nu op Rondje. Bekijk de honden!`)).toBeVisible()
  await expect(walker.page.getByText(`Er is een groepswandeling gepland bij ${shelterName}. Loop je mee?`)).toBeVisible()
  await shot(walker.page, '32-notifications-loop')

  // And can join it straight from the shelter's page.
  await walker.page.getByText(`Er is een groepswandeling gepland bij ${shelterName}`).click()
  await expect(walker.page).toHaveURL(/\/dogs\?org=/)
  await walker.page.getByRole('button', { name: 'Ik loop mee' }).first().click()
  await expect(walker.page.getByText('Je bent aangemeld').first()).toBeVisible()

  for (const p of [walker, staff, admin]) await p.context.close()
})
