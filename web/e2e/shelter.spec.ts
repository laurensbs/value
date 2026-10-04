import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { newPerson, onboard, PNG_1X1, shot, signInAdmin, signUp, unique } from './helpers'

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
  // The street address is for Rondje only: it must never show up on a public page or in structured data.
  await staff.page.getByLabel('Adres', { exact: true }).fill('Geheimstraat 12')
  await staff.page.getByLabel(/KvK-, KBO- of CIF-nummer/).fill('12345678')
  await staff.page.getByLabel('Hoeveel honden hebben jullie ongeveer?').fill('40')
  await staff.page.getByLabel('Instagram').fill('@opvang_test')
  await staff.page.getByLabel('Wanneer kunnen vrijwilligers komen wandelen?').fill('Zaterdag en zondag 10:00–12:00')
  await staff.page.getByLabel('Nee, wij hebben koekjes').check()
  await staff.page.getByLabel('Naam contactpersoon').fill('Marieke de Vries')
  await staff.page.getByLabel(/Ik mag deze opvang vertegenwoordigen/).check()
  await staff.page.getByRole('button', { name: 'Opvang aanmelden' }).click()
  await expect(staff.page).toHaveURL(/\/shelter\/[^/]+\?created=1/)
  await expect(staff.page.getByText('Wordt gecontroleerd').first()).toBeVisible()
  const shelterPath = new URL(staff.page.url()).pathname
  const orgId = shelterPath.split('/').pop()!
  // The tabs now lead to the shelter.
  await expect(staff.page.locator(`nav[aria-label="Hoofdmenu"] a[href="${shelterPath}"]`)).toBeAttached()
  // Vandaag for staff: one thing about their shelter, not the walkers' quiz or dogs to ask for.
  await staff.page.goto('/')
  const staffStep = staff.page.getByRole('region', { name: 'Eén ding nu' })
  await expect(staffStep).toContainText(`Plan een groepswandeling bij ${orgName}`)
  await expect(staffStep.getByRole('link', { name: `Naar ${orgName}` })).toHaveAttribute('href', shelterPath)
  await expect(staff.page.locator('main')).not.toContainText(/veiligheidsquiz|Honden bij jou in de buurt/)
  await staff.page.goto(shelterPath)

  // --- Bulk import from the downloadable template ---
  await staff.page.getByLabel('Of plak de inhoud hier').fill(readFileSync('public/rondje-honden-voorbeeld.csv', 'utf8'))
  await staff.page.getByRole('button', { name: 'Importeren' }).click()
  await expect(staff.page.getByText('3 honden toegevoegd.')).toBeVisible()
  await expect(staff.page.getByText('Rocky', { exact: true })).toBeVisible()

  // --- Quick add with photos: one photo per dog, names from the file names, then all online ---
  await staff.page.getByRole('link', { name: "Snel toevoegen met foto's" }).first().click()
  await expect(staff.page).toHaveURL(/\/dogs\/bulk$/)
  await staff.page.locator('input[type=file]').setInputFiles([
    { name: 'Saar.png', mimeType: 'image/png', buffer: PNG_1X1 },
    { name: 'IMG_1234.png', mimeType: 'image/png', buffer: PNG_1X1 },
  ])
  await expect(staff.page.getByLabel('Naam van hond 2')).toBeVisible()
  await expect(staff.page.getByLabel('Naam van hond 1')).toHaveValue('Saar')
  await expect(staff.page.getByLabel('Naam van hond 2')).toHaveValue('')
  await shot(staff.page, '20b-shelter-bulk')
  await staff.page.getByRole('button', { name: 'Zet 1 hond online' }).click()
  await expect(staff.page.getByText('1 hond staat nu online.')).toBeVisible()
  await expect(staff.page.getByText(/1 hond heeft nog geen naam en blijft concept/)).toBeVisible()
  await staff.page.getByLabel('Naam van hond 1').fill('Pip')
  await staff.page.getByRole('button', { name: 'Zet 1 hond online' }).click()
  await expect(staff.page.getByText('1 hond staat nu online.')).toBeVisible()
  await staff.page.getByRole('link', { name: 'Klaar' }).click()
  await expect(staff.page.getByText('Saar', { exact: true })).toBeVisible()
  await expect(staff.page.getByText('Pip', { exact: true })).toBeVisible()
  await expect(staff.page.getByText(/5 van ongeveer 40 honden staan online/)).toBeVisible()
  await staff.page.goto(`${shelterPath}/edit`)
  await expect(staff.page.getByLabel('Naam contactpersoon')).toHaveValue('Marieke de Vries')
  await shot(staff.page, '20c-shelter-edit')
  await staff.page.goto(`${shelterPath}/poster`)
  await expect(staff.page.getByRole('img', { name: /QR-code naar de honden/ })).toBeVisible()
  await shot(staff.page, '20d-shelter-poster')
  await staff.page.goto(shelterPath)

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
  const admin = await signInAdmin(browser)
  await admin.page.goto('/admin/shelters')
  await shot(admin.page, '22-admin')
  const row = admin.page.getByRole('listitem').filter({ hasText: orgName })
  await expect(row.getByText('Marieke de Vries')).toBeVisible()
  await expect(row.getByRole('link', { name: /Opzoeken in het register/ })).toHaveAttribute('href', /kvk\.nl/)
  await row.getByRole('button', { name: 'Verifiëren' }).click()
  await expect(admin.page.getByText(orgName)).toHaveCount(0)

  // --- The dogs are public now, with the shelter's details but never its private contact ---
  await visitor.page.goto(`/dogs?org=${orgId}`)
  await expect(visitor.page.getByText('Bram').first()).toBeVisible()
  await expect(visitor.page.getByText('Saar').first()).toBeVisible()
  await expect(visitor.page.getByText('Zaterdag en zondag 10:00–12:00')).toBeVisible()
  await expect(visitor.page.getByText('Neem geen eigen koekjes mee: de opvang heeft ze.')).toBeVisible()
  await expect(visitor.page.getByRole('link', { name: '@opvang_test' })).toBeVisible()
  await expect(visitor.page.getByText('Marieke de Vries')).toHaveCount(0)
  // The planned group walk is on the shelter's public page, with a button to join.
  await expect(visitor.page.getByText('Verzamelen: Bij de hoofdingang').first()).toBeVisible()
  await shot(visitor.page, '22b-shelter-public')

  // --- Its city has something real now: Utrecht goes into search engines, with the walk as an event ---
  await visitor.page.goto('/cities/utrecht')
  await expect(visitor.page.getByText(orgName).first()).toBeVisible()
  await expect(visitor.page.locator('meta[name="robots"]')).toHaveCount(0)
  const structured = await visitor.page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((blocks) => blocks.flatMap((b) => [JSON.parse(b.textContent ?? '[]')].flat()))
  expect(structured.map((t) => t['@type'])).toContain('BreadcrumbList')
  expect(structured).toContainEqual(
    expect.objectContaining({
      '@type': 'Event',
      name: `Groepswandeling bij ${orgName}`,
      isAccessibleForFree: true,
      // The walk's own place: the meeting point in the city, never the shelter's street address.
      location: { '@type': 'Place', name: 'Bij de hoofdingang', address: { '@type': 'PostalAddress', addressLocality: 'Utrecht', addressCountry: 'NL' } },
      organizer: expect.objectContaining({ name: orgName }),
      url: expect.stringMatching(/\/cities\/utrecht#groepswandeling-/),
    }),
  )
  // The event's address works: it leads to the walk on the page.
  const eventUrl = structured.find((t) => t['@type'] === 'Event' && t.name === `Groepswandeling bij ${orgName}`).url as string
  await expect(visitor.page.locator(`[id="${new URL(eventUrl).hash.slice(1)}"]`)).toContainText(orgName)
  expect(await (await visitor.page.request.get('/cities/utrecht')).text()).not.toContain('Geheimstraat')
  expect(await (await visitor.page.request.get('/sitemap.xml')).text()).toContain('/cities/utrecht<')

  // --- A walker joins the group walk ---
  const walker = await newPerson(browser)
  await signUp(walker.page, { name: 'Sem', email: `sem-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2004-09-30', city: 'Utrecht', bio: 'Ik wil graag helpen in de opvang.', phone: '06 1111 2222', walker: true, owner: false })
  await walker.page.goto('/group-walks?country=NL')
  const walkItem = walker.page.getByRole('listitem').filter({ hasText: orgName })
  await walkItem.getByRole('button', { name: 'Ik loop mee' }).click()
  await expect(walkItem.getByText('Je bent aangemeld')).toBeVisible()
  // Signed up: the walk goes into the calendar, with the ID note and a reminder an hour before.
  const groupCalendar = await walkItem.getByRole('link', { name: 'Zet in je agenda' }).getAttribute('href')
  const groupIcs = await walker.page.request.get(groupCalendar!)
  expect(groupIcs.headers()['content-type']).toContain('text/calendar')
  const groupFile = await groupIcs.text()
  expect(groupFile).toContain(`\r\nSUMMARY:Groepswandeling bij ${orgName}\r\n`)
  expect(groupFile).toContain('\r\nLOCATION:Bij de hoofdingang\\, Utrecht\r\n')
  expect(groupFile).toContain('\r\nTRIGGER:-PT60M\r\n')
  // Signed out, the file is not there: the link leads to the login.
  expect((await visitor.page.request.get(groupCalendar!, { maxRedirects: 0 })).status()).toBe(307)
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
