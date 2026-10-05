import { expect, test } from '@playwright/test'
import { newPerson, onboard, PNG_1X1, shot, signUp, unique } from './helpers'

// DPIA maatregel M4 (risk R3): without an account, a private owner's dog page shows the dog, its
// town and "Eigenaar in de buurt". Not the owner's first name, photo, words about themselves or the
// dog's weekly moments, also not in the HTML, the link preview or the page's data for the browser.
// Signed in, the page is as it was. At 375 px: most people come from Instagram on a phone.
const PHONE = { viewport: { width: 375, height: 812 } }

test('a private owner stays out of sight without an account, and shows as before once signed in', async ({ browser }) => {
  test.setTimeout(240_000)
  const id = unique()
  const bio = 'Ik ben Ottilie en ik woon hier al veertig jaar.'

  // --- Ottilie signs up, with a photo and a few words about herself ---
  const owner = await newPerson(browser, undefined, PHONE)
  await signUp(owner.page, { name: 'Ottilie', email: `ottilie-${id}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1949-03-03', city: 'Utrecht', bio, phone: '06 1212 3434', walker: false, owner: true })
  await owner.page.goto('/profile/edit')
  await owner.page.locator('input[type=file]').setInputFiles({ name: 'ottilie.png', mimeType: 'image/png', buffer: PNG_1X1 })
  await expect(owner.page.getByText('Andere foto')).toBeVisible()
  await owner.page.getByRole('button', { name: 'Opslaan' }).click()
  await expect(owner.page.getByText('Opgeslagen', { exact: true })).toBeVisible()

  // --- She adds Bobbie for her neighbour, with a weekly moment at 07:45 ---
  await owner.page.goto('/my-dogs/new')
  await owner.page.getByLabel('Naam', { exact: true }).fill('Bobbie')
  const next = owner.page.getByRole('button', { name: 'Verder' })
  // Past the name, the character and the story to the walk.
  for (let step = 0; step < 3; step++) await next.click()
  await owner.page.getByRole('button', { name: 'Moment toevoegen' }).click()
  await owner.page.getByLabel('Tijd', { exact: true }).fill('07:45')
  // Past the walk and where.
  for (let step = 0; step < 2; step++) await next.click()
  // For someone else (DPIA maatregel M5): only when the owner knows and agrees.
  await owner.page.getByLabel('Ik meld deze hond aan voor iemand anders').check()
  await next.click()
  const problem = owner.page.locator('.onboarding-actions').getByRole('alert')
  await expect(problem).toHaveText('Vink aan dat de eigenaar ervan weet en het goed vindt.')
  await owner.page.getByLabel('De eigenaar weet ervan en vindt het goed').check()
  await expect(problem).toHaveCount(0)
  await next.click()
  await owner.page.getByLabel(/Ik ben verzekerd/).check()
  await owner.page.getByLabel(/gechipt en gevaccineerd/).check()
  await owner.page.getByRole('button', { name: 'Zet Bobbie online' }).click()
  await expect(owner.page).toHaveURL(/\/dogs\/[^/?]+\?saved=1$/)
  const dogPath = new URL(owner.page.url()).pathname

  // --- Signed in, someone else sees Ottilie as before: name, photo, her words and the moment ---
  const walker = await newPerson(browser, undefined, PHONE)
  await signUp(walker.page, { name: 'Sanne', email: `sanne-${id}@e2e.test` })
  await onboard(walker.page, { birthDate: '2001-01-01', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false, quiz: false })
  await walker.page.goto(dogPath)
  const host = walker.page.locator('.host')
  await expect(host).toContainText('Ottilie uit Utrecht')
  await expect(host).toContainText(bio)
  const photo = await host.locator('img.avatar').getAttribute('src')
  expect(photo).toBeTruthy()
  await expect(walker.page.getByRole('heading', { name: 'Wanneer kan het' })).toBeVisible()
  await expect(walker.page.locator('main')).toContainText('07:45')
  const signedIn = await (await walker.page.request.get(dogPath)).text()
  expect(signedIn).toContain('Ottilie')
  expect(signedIn).toContain(photo!)
  await shot(walker.page, 'hondenpagina-ingelogd')

  // --- Without an account: the dog, its town and "Eigenaar in de buurt", nothing about Ottilie ---
  const visitor = await newPerson(browser, undefined, PHONE)
  const page = visitor.page
  const response = await page.goto(dogPath)
  const html = await response!.text()
  await expect(page.getByRole('heading', { name: 'Bobbie', exact: true })).toBeVisible()
  await expect(page.locator('.host')).toContainText('Eigenaar in de buurt')
  await expect(page.locator('.host')).toContainText('In Utrecht.')
  await expect(page.getByRole('heading', { name: 'Wanneer kan het' })).toHaveCount(0)
  await expect(page.locator('.host img')).toHaveCount(0)
  // The whole HTML, with the link preview's meta tags and the page's data for the browser in it.
  expect(html).toContain('Bobbie')
  for (const secret of ['Ottilie', 'veertig jaar', photo!, '07:45']) expect(html, secret).not.toContain(secret)
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Bobbie zoekt een wandelmaatje')
  // The same page fetched again as page data (a client-side navigation): nothing about her either.
  const flight = await page.request.get(dogPath, { headers: { RSC: '1' } })
  expect(flight.headers()['content-type']).toContain('text/x-component')
  const data = await flight.text()
  expect(data).toContain('Bobbie')
  for (const secret of ['Ottilie', 'veertig jaar', photo!, '07:45']) expect(data, secret).not.toContain(secret)
  // Still one tap to meet Bobbie: an account first, then straight back here.
  await expect(page.locator('.plan-bar').getByRole('link', { name: 'Maak kennis met Bobbie' })).toBeInViewport()
  await shot(page, 'hondenpagina-uitgelogd')

  // The list of dogs, its map and "Net aangemeld" on the home page never name her either. (Her photo
  // is a 1×1 test image that other tests also give their dogs, so it is only looked for above.)
  for (const path of ['/dogs', '/dogs?view=map', '/']) {
    const text = await (await page.request.get(path)).text()
    for (const secret of ['Ottilie', 'veertig jaar']) expect(text, `${path}: ${secret}`).not.toContain(secret)
  }
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Net aangemeld' }).locator(`a[href="${dogPath}"]`)).toBeVisible()
  await page.goto('/dogs?view=map')
  await expect(page.getByText('Honden uit de buurt zie je op de kaart als je bent ingelogd.')).toBeVisible()

  await owner.context.close()
  await walker.context.close()
  await visitor.context.close()
})

test('a shelter dog’s page is the same with or without an account', async ({ browser }) => {
  const visitor = await newPerson(browser, undefined, PHONE)
  await visitor.page.goto('/dogs/demo-mo')
  const before = visitor.page.locator('.host')
  await expect(before).toContainText('Dierenopvang Zuidpark')
  await expect(visitor.page.getByRole('heading', { name: 'Groepswandelingen bij Dierenopvang Zuidpark' })).toBeVisible()
  await expect(visitor.page.getByText('Eigenaar in de buurt')).toHaveCount(0)

  const member = await newPerson(browser, undefined, PHONE)
  await signUp(member.page, { name: 'Joris', email: `joris-${unique()}@e2e.test` })
  await onboard(member.page, { birthDate: '2000-02-02', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false, quiz: false })
  await member.page.goto('/dogs/demo-mo')
  expect(await member.page.locator('.host').innerText()).toBe(await before.innerText())

  await visitor.context.close()
  await member.context.close()
})
