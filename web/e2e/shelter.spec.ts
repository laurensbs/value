import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { newPerson, onboard, shot, signUp, unique } from './helpers'

test('shelter: sign up, import dogs from CSV, plan a group walk, admin verifies, walker joins, staff checks ID', async ({ browser }) => {
  const id = unique()
  const orgName = `Dierenopvang Test ${id}`

  // --- Shelter staff member creates the shelter ---
  const staff = await newPerson(browser)
  await signUp(staff.page, { name: 'Marieke', email: `marieke-${id}@e2e.test`, intent: 'shelter' })
  await onboard(staff.page, { birthDate: '1985-02-11', city: 'Utrecht', bio: 'Coördinator vrijwilligers.', phone: '030 123 4567', walker: false, owner: false })
  await expect(staff.page).toHaveURL(/\/shelter$/)
  await shot(staff.page, '20-shelter-signup')
  await staff.page.getByLabel('Naam van de opvang').fill(orgName)
  await staff.page.getByLabel('Plaats').fill('Utrecht')
  await staff.page.getByLabel(/KvK-, KBO- of CIF-nummer/).fill('12345678')
  await staff.page.getByLabel(/Ik mag deze opvang vertegenwoordigen/).check()
  await staff.page.getByRole('button', { name: 'Opvang aanmelden' }).click()
  await expect(staff.page).toHaveURL(/\/shelter\/[^/]+\?created=1/)
  await expect(staff.page.getByText('Wordt gecontroleerd').first()).toBeVisible()
  const shelterPath = new URL(staff.page.url()).pathname
  const orgId = shelterPath.split('/').pop()!

  // --- Bulk import from the downloadable template ---
  await staff.page.getByLabel('Of plak de inhoud hier').fill(readFileSync('public/rondje-honden-voorbeeld.csv', 'utf8'))
  await staff.page.getByRole('button', { name: 'Importeren' }).click()
  await expect(staff.page.getByText('3 honden toegevoegd.')).toBeVisible()
  await expect(staff.page.getByText('Rocky', { exact: true })).toBeVisible()

  // --- Plan a group walk ---
  await staff.page.getByLabel('Verzamelpunt').fill('Bij de hoofdingang')
  await staff.page.getByRole('button', { name: 'Groepswandeling plannen' }).click()
  await expect(staff.page.getByText('Groepswandeling gepland.')).toBeVisible()
  await shot(staff.page, '21-shelter-dashboard')

  // Not visible to the public before verification.
  const visitor = await newPerson(browser)
  await visitor.page.goto(`/dogs?org=${orgId}`)
  await expect(visitor.page.getByText('Bram')).toHaveCount(0)

  // --- Admin verifies the shelter ---
  const admin = await newPerson(browser)
  await admin.page.goto('/signup')
  await admin.page.getByLabel('Voornaam').fill('Beheer')
  await admin.page.getByLabel('E-mailadres').fill('admin@e2e.test')
  await admin.page.getByLabel('Wachtwoord').fill('wandelen-123')
  await admin.page.getByRole('button', { name: 'Account maken' }).click()
  // On a reused test server the admin account may already exist.
  const exists = admin.page.getByText(/Er bestaat al een account/)
  await Promise.race([admin.page.waitForURL(/\/onboarding/), exists.waitFor()])
  if (await exists.isVisible()) {
    await admin.page.goto('/login?next=/admin')
    await admin.page.getByLabel('E-mailadres').fill('admin@e2e.test')
    await admin.page.getByLabel('Wachtwoord').fill('wandelen-123')
    await admin.page.getByRole('button', { name: 'Inloggen', exact: true }).click()
    await admin.page.waitForURL(/\/admin/)
  } else {
    await onboard(admin.page, { birthDate: '1990-01-01', city: 'Utrecht', bio: 'Beheer', phone: '', walker: false, owner: false })
  }
  await admin.page.goto('/admin')
  await shot(admin.page, '22-admin')
  const row = admin.page.getByRole('listitem').filter({ hasText: orgName })
  await row.getByRole('button', { name: 'Verifiëren' }).click()
  await expect(admin.page.getByText(orgName)).toHaveCount(0)

  // --- The dogs are public now ---
  await visitor.page.goto(`/dogs?org=${orgId}`)
  await expect(visitor.page.getByText('Bram').first()).toBeVisible()

  // --- A walker joins the group walk ---
  const walker = await newPerson(browser)
  await signUp(walker.page, { name: 'Sem', email: `sem-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2004-09-30', city: 'Utrecht', bio: 'Ik wil graag helpen in de opvang.', phone: '06 1111 2222', walker: true, owner: false })
  await walker.page.goto('/group-walks?country=NL')
  const walkItem = walker.page.getByRole('listitem').filter({ hasText: orgName })
  await walkItem.getByRole('button', { name: 'Ik loop mee' }).click()
  await expect(walkItem.getByText('Je bent aangemeld')).toBeVisible()
  await shot(walker.page, '23-group-walks')
  await walker.page.goto('/shelters?country=NL')
  await shot(walker.page, '24-directory')
  await walker.page.goto('/help')
  await shot(walker.page, '25-help')

  // --- Staff sees the signup, checks the ID in person and marks attendance ---
  await staff.page.goto(shelterPath)
  const signup = staff.page.getByRole('listitem').filter({ hasText: 'Sem' }).last()
  await expect(signup).toBeVisible()
  await signup.getByLabel('ID gezien').check()
  await signup.getByRole('button', { name: 'Was er' }).click()
  await expect(signup.getByText('Was er')).toBeVisible()

  for (const p of [staff, visitor, admin, walker]) await p.context.close()
})
