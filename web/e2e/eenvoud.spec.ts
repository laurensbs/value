import { expect, test } from '@playwright/test'
import { addDog, newPerson, onboard, passQuiz, shot, signUp, smallTargets, unique } from './helpers'

// Rustig en slim, like the iPhone app (_werk/eenvoud-ios.md): the dogs first on Ontdek with the map
// as a screen of its own, one thing to do on Vandaag, and the profile with its head on top.
// Everything at 390 px, the phone the screens are designed for.
const PHONE = { viewport: { width: 390, height: 844 } }

test('Ontdek: the dogs on top, one line above them, the map fills the screen and a paw shows its dog', async ({ browser }) => {
  const walker = await newPerson(browser, undefined, PHONE)
  const page = walker.page
  await signUp(page, { name: 'Mila', email: `mila-${unique()}@e2e.test` })
  await onboard(page, { birthDate: '2002-03-04', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false, quiz: false })
  await page.getByRole('link', { name: 'Later doen' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/profile/quiz'))

  await page.goto('/dogs')
  // Search, Lijst | Kaart and the filters; then at most one line (the quiz, for now); then the dogs.
  const views = page.getByRole('navigation', { name: 'Lijst of kaart' })
  await expect(views.getByRole('link', { name: 'Lijst' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('search')).toBeInViewport()
  const line = page.getByRole('complementary', { name: 'Eén ding nu' })
  await expect(line).toContainText('Eerst de veiligheidsquiz')
  await expect(page.locator('.dcard').first()).toBeInViewport()
  await expect(page.locator('main')).not.toContainText(/Je eerste stappen|Samen deze maand|Wie gaat er vandaag mee/)
  expect(await smallTargets(page)).toEqual([])
  await shot(page, 'eenvoud-01-ontdek')
  // The cross puts the line away, also after a reload.
  await line.getByRole('button', { name: 'Later' }).click()
  await expect(line).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.dcard').first()).toBeVisible()
  await expect(page.getByRole('complementary', { name: 'Eén ding nu' })).toHaveCount(0)

  // Kaart: straight under the search bar down to the bottom of the screen, nothing to scroll.
  await views.getByRole('link', { name: 'Kaart' }).click()
  await expect(page).toHaveURL(/view=map/)
  const map = page.getByRole('region', { name: 'Honden die op een rondje wachten' })
  await expect(map).toBeVisible()
  const box = (await map.boundingBox())!
  expect(box.y).toBeLessThan(844 / 2)
  expect(box.y + box.height).toBeGreaterThanOrEqual(844 - 2)
  expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeLessThanOrEqual(1)
  await expect(page.getByText('Honden staan op hun buurt, nooit op een adres.')).toBeVisible()
  // Leaflet animates its first zoom, and the paws scale along: measure once the map stands still.
  await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0)
  await page.waitForTimeout(300)
  expect(await smallTargets(page)).toEqual([])

  // A paw: a compact card of that dog at the bottom. Again on the paw: gone. The card opens the dog.
  const paw = page.locator('.leaflet-marker-icon:has(.map-dog)').first()
  await paw.click()
  const card = page.locator('.map-card')
  await expect(card).toBeVisible()
  await expect(page.locator('.map-dog.selected')).toHaveCount(1)
  await shot(page, 'eenvoud-02-kaart-pootje')
  const href = (await card.getAttribute('href'))!
  expect(href).toMatch(/^\/dogs\/[^/?]+$/)
  await paw.click()
  await expect(card).toHaveCount(0)
  await paw.click()
  await page.keyboard.press('Escape')
  await expect(card).toHaveCount(0)
  // With the keyboard: Enter on a focused paw opens the card, Space closes it again.
  await paw.focus()
  await page.keyboard.press('Enter')
  await expect(card).toBeVisible()
  await page.keyboard.press(' ')
  await expect(card).toHaveCount(0)
  await paw.click()
  await card.click()
  await expect(page).toHaveURL(new RegExp(`${href}$`))
  await walker.context.close()
})

test('Vandaag: one thing now, Later puts it away, and an honest empty town', async ({ browser }) => {
  // Zwolle: no real dogs nearby in the test data.
  const walker = await newPerson(browser, { latitude: 52.5168, longitude: 6.083 }, PHONE)
  const page = walker.page
  await signUp(page, { name: 'Noa', email: `noa-${unique()}@e2e.test` })
  await onboard(page, { birthDate: '2001-07-08', city: 'Zwolle', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false, quiz: false })
  await page.getByRole('link', { name: 'Later doen' }).click()
  await expect(page).toHaveURL(/\/\?welcome=1$/)

  // One card, one big button: the quiz comes before any request.
  const card = page.getByRole('region', { name: 'Eén ding nu' })
  await expect(card.getByRole('heading', { name: 'Welkom bij Rondje, Noa!' })).toBeVisible()
  await expect(card).toContainText('Je bent nu Puppy, level 1.')
  await expect(card).toContainText('Eerst de veiligheidsquiz, dan kun je een hond vragen.')
  const button = card.getByRole('link', { name: 'Start de quiz' })
  await expect(button).toHaveAttribute('href', /^\/profile\/quiz\?next=/)
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(56)
  await expect(button).toBeInViewport()
  // Nothing else as a card above the dogs, and nothing that counts down or counts nothing.
  await expect(page.locator('main .today > :is(section, div)').first()).toHaveClass(/next-step/)
  await expect(page.locator('main')).not.toContainText(/0 van \d|Nog \d+ dag|voor je weekdoel|Je eerste stappen|Tip van vandaag/)
  expect(await smallTargets(page)).toEqual([])
  await shot(page, 'eenvoud-03-vandaag-quiz')

  // Later: the next thing. Here no real dog lives nearby, so: we start here, with two ways to begin.
  await card.getByRole('button', { name: 'Later' }).click()
  await expect(card).toContainText('We beginnen hier.')
  await expect(card.getByRole('link', { name: 'Groepswandelingen' })).toHaveAttribute('href', '/group-walks')
  await expect(card.getByRole('link', { name: 'Tip een opvang' })).toHaveAttribute('href', '/suggest?kind=shelter')
  await expect(card.getByRole('button', { name: 'Later' })).toHaveCount(0)
  await shot(page, 'eenvoud-04-vandaag-lege-stad')
  // Remembered on this device for a week, in a cookie, so the page comes with the right step from
  // the server and nothing jumps after it loads: the card in the HTML (scripts left out) already
  // has it.
  const html = (await (await page.request.get('/')).text()).replace(/<script[\s\S]*?<\/script>/g, '')
  const served = html.slice(html.indexOf('class="next-step"'), html.indexOf('</section>', html.indexOf('class="next-step"')))
  expect(served).toContain('We beginnen hier.')
  expect(served).not.toContain('veiligheidsquiz')
  await page.reload()
  await expect(page.getByRole('region', { name: 'Eén ding nu' })).toContainText('We beginnen hier.')
  const cookie = (await walker.context.cookies()).find((c) => c.name === 'rondje_later')!
  const later = JSON.parse(decodeURIComponent(cookie.value))
  expect(later.quiz.count).toBe(1)
  expect(later.quiz.until).toBeGreaterThan(Date.now() + 6 * 86_400_000)

  // The profile: edit and invite in its head, the rest in groups with a heading.
  await page.goto('/profile')
  const head = page.getByRole('region', { name: 'Zo zien anderen je' })
  await expect(head.getByRole('link', { name: 'Profiel bewerken' })).toHaveAttribute('href', '/profile/edit')
  await expect(head.getByRole('link', { name: 'Profiel bewerken' })).toBeInViewport()
  await expect(head.getByRole('button', { name: 'Nodig uit' })).toBeVisible()
  await expect(head.getByRole('link', { name: /^Jouw voortgang: Level 1/ })).toHaveAttribute('href', '/progress')
  for (const name of ['Wandelen', 'Help mee', 'Instellingen', 'Account']) await expect(page.getByRole('heading', { name, exact: true, level: 2 })).toBeVisible()
  expect(await smallTargets(page)).toEqual([])
  await shot(page, 'eenvoud-05-profiel')

  // Your first steps are all on /progress.
  await page.goto('/progress')
  await expect(page.getByRole('heading', { name: 'Je eerste stappen' })).toBeVisible()
  await walker.context.close()
})

test('Kaart without scrolling on a small phone and on its side, the card never over the zoom buttons', async ({ browser }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 320, height: 480 },
    { width: 844, height: 390 },
  ]) {
    const walker = await newPerson(browser, undefined, { viewport })
    const page = walker.page
    await signUp(page, { name: 'Kai', email: `kai-${viewport.width}x${viewport.height}-${unique()}@e2e.test` })
    await onboard(page, { birthDate: '2000-01-01', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false })
    await page.goto('/dogs?view=map')
    const map = page.getByRole('region', { name: 'Honden die op een rondje wachten' })
    await expect(map).toBeVisible()
    const size = `${viewport.width}x${viewport.height}`
    expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight), size).toBeLessThanOrEqual(1)
    const box = (await map.boundingBox())!
    expect(box.y + box.height, size).toBeGreaterThanOrEqual(viewport.height - 2)
    expect(box.height, size).toBeGreaterThan(180)
    await page.locator('.leaflet-marker-icon:has(.map-dog)').first().click()
    const card = (await page.locator('.map-card').boundingBox())!
    const zoom = (await page.locator('.leaflet-control-zoom').boundingBox())!
    const covers = !(card.x + card.width <= zoom.x || zoom.x + zoom.width <= card.x || card.y + card.height <= zoom.y || zoom.y + zoom.height <= card.y)
    expect(covers, `${size}: the card covers the zoom buttons`).toBe(false)
    expect(card.y, size).toBeGreaterThan(box.y)
    await shot(page, `eenvoud-07-kaart-${size}`)
    await walker.context.close()
  }
})

test('at night: what happens now still shows, planning waits, and there is a calm way on', async ({ browser }) => {
  const night = { 'x-rondje-now': '2026-10-05T23:30:00+02:00' }
  // A real dog nearby, so by day the one thing would be to go and meet it.
  const owner = await newPerson(browser)
  await signUp(owner.page, { name: 'Els', email: `els-${unique()}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1950-05-05', city: 'Utrecht', bio: 'Ik ben Els.', phone: '06 1111 2222', walker: false, owner: true })
  await addDog(owner.page, 'Loebas')

  const walker = await newPerson(browser, undefined, { ...PHONE, extraHTTPHeaders: night })
  const page = walker.page
  await signUp(page, { name: 'Ravi', email: `ravi-${unique()}@e2e.test` })
  await onboard(page, { birthDate: '2001-01-01', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false, quiz: false })
  await page.getByRole('link', { name: 'Later doen' }).click()
  // The quiz is something for yourself: fine at night.
  const card = page.getByRole('region', { name: 'Eén ding nu' })
  await expect(card).toContainText('Eerst de veiligheidsquiz')
  await page.goto('/profile/quiz')
  await passQuiz(page)
  // Asking for a dog waits until the morning; a lesson is a calm way on.
  await page.goto('/')
  await expect(card).toContainText('Het is al laat. Plannen kan morgen ook.')
  await expect(card.getByRole('link', { name: 'Lees een les' })).toHaveAttribute('href', '/school')
  await shot(page, 'eenvoud-08-nacht')
  // The same person by day: the dog nearby.
  await walker.context.setExtraHTTPHeaders({ 'x-rondje-now': '2026-10-06T09:30:00+02:00' })
  await page.goto('/')
  await expect(card).toContainText('zoekt een wandelmaatje')
  await owner.context.close()
  await walker.context.close()
})

test("a dog's page: the button at hand steps aside for the plan and never covers the footer", async ({ browser }) => {
  const owner = await newPerson(browser)
  await signUp(owner.page, { name: 'Wim', email: `wim-${unique()}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1948-08-08', city: 'Utrecht', bio: 'Ik ben Wim.', phone: '06 3333 4444', walker: false, owner: true })
  await addDog(owner.page, 'Pluis')
  const dogPath = new URL(owner.page.url()).pathname

  // Someone the owner sent the link to, without an account yet.
  const visitor = await newPerson(browser, undefined, PHONE)
  const page = visitor.page
  await page.goto(dogPath)
  const bar = page.locator('.plan-bar')
  await expect(bar).not.toHaveClass(/away/)
  await expect(bar.getByRole('link', { name: 'Maak kennis met Pluis' })).toBeInViewport()
  // The plan itself in view: the bar is gone, never two of the same button at once.
  await page.locator('#plan').scrollIntoViewIfNeeded()
  await expect(bar).toHaveClass(/away/)
  // At the very bottom the footer links are free to tap.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(bar).toHaveClass(/away/)
  await page.getByRole('contentinfo').getByRole('link').last().click({ trial: true })
  await owner.context.close()
  await visitor.context.close()
})
