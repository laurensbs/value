import { expect, test } from '@playwright/test'
import { newPerson, onboard, shot, signUp, smallTargets, unique } from './helpers'

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
  // Remembered in this browser for a week.
  await page.reload()
  await expect(page.getByRole('region', { name: 'Eén ding nu' })).toContainText('We beginnen hier.')
  const later = await page.evaluate(() => JSON.parse(localStorage.getItem('rondje.nextStep') ?? '{}'))
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
