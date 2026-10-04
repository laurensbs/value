import { expect, test } from '@playwright/test'
import { addDog, newPerson, onboard, shot, signUp, unique } from './helpers'

test('pages: support, about, robots, sitemap and short links', async ({ browser }) => {
  const { context, page } = await newPerson(browser)
  await page.goto('/support')
  await expect(page.getByRole('heading', { name: 'Maak Rondje mogelijk', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Onze belofte' })).toBeVisible()
  await expect(page.getByText(/Samen ongeveer/)).toBeVisible()
  await shot(page, '29-support')

  await page.goto('/over-ons')
  await expect(page).toHaveURL(/\/about$/)
  await expect(page.getByRole('heading', { name: /Samen een rondje/, level: 1 })).toBeVisible()
  // The founder's story is still a template: nothing of it is shown until it is published.
  await expect(page.getByText(/Schrijfvraag/)).toHaveCount(0)
  await shot(page, '30-about')

  await page.goto('/tip')
  await expect(page).toHaveURL(/\/suggest$/)

  await page.goto('/flyer?for=owner')
  await expect(page.getByRole('heading', { name: /Kan uw hond wel een extra rondje/ })).toBeVisible()
  await expect(page.getByRole('img', { name: 'QR-code naar Rondje' })).toBeVisible()
  await shot(page, '31-flyer')

  // Forgot password: linked from the login page; without an email service it says so instead of pretending.
  await page.goto('/login')
  await page.getByRole('link', { name: 'Wachtwoord vergeten?' }).click()
  await expect(page.getByRole('heading', { name: 'Wachtwoord vergeten', level: 1 })).toBeVisible()
  await expect(page.getByText(/kan nog niet|staat er nu een e-mail/).or(page.getByRole('button', { name: 'Stuur de link' }))).toBeVisible()
  await page.goto('/reset-password')
  await expect(page.getByText('Deze link is verlopen of al gebruikt.')).toBeVisible()

  // City pages for search engines: shelters from the directory, the free promise, and no private dogs.
  await page.goto('/cities')
  await expect(page.getByRole('heading', { name: 'Honden uitlaten per stad', level: 1 })).toBeVisible()
  await page.getByRole('link', { name: 'Amsterdam', exact: true }).click()
  await expect(page).toHaveURL(/\/cities\/amsterdam$/)
  await expect(page.getByRole('heading', { name: 'Honden uitlaten in Amsterdam', level: 1 })).toBeVisible()
  await expect(page.getByText('Dierenopvangcentrum Amsterdam (DOA)')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Altijd gratis, nooit advertenties' })).toBeVisible()
  await shot(page, '32-city')
  expect((await page.request.get('/cities/atlantis')).status()).toBe(404)
  // Pages with a loading screen still answer with a real status: 404 for a dog that isn't there, and a
  // redirect to the login page for a visitor.
  expect((await page.request.get('/dogs/bestaat-niet')).status()).toBe(404)
  for (const path of ['/requests', '/progress']) {
    const response = await page.request.get(path, { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers().location).toContain('/login')
  }

  expect(await (await page.request.get('/robots.txt')).text()).toContain('Disallow: /admin')
  expect(await (await page.request.get('/sitemap.xml')).text()).toContain('/cities/amsterdam')
  expect(await (await page.request.get('/sitemap.xml')).text()).toContain('/support')

  // The app on the home screen opens on Today, in the visitor's language, with shortcuts on Android.
  const manifest = await (await page.request.get('/manifest.webmanifest', { headers: { 'accept-language': 'en' } })).json()
  expect(manifest).toMatchObject({ id: '/dogs', start_url: '/', lang: 'en', description: "A regular walk with a dog who's waiting for you." })
  expect(manifest.shortcuts.map((s: { name: string; url: string }) => [s.name, s.url])).toEqual([
    ['Dogs nearby', '/dogs'],
    ['My walks', '/requests'],
    ['Notifications', '/notifications'],
  ])
  await context.close()
})

test('support link: on the website when the recipient is named, never in the app', async ({ browser }) => {
  const web = await newPerson(browser)
  await web.page.goto('/support')
  const link = web.page.getByRole('link', { name: /Steun Rondje via/ })
  test.skip((await link.count()) === 0, 'Needs SUPPORT_URL and OPERATOR_NAME on the server (see playwright.config.ts)')
  await expect(link).toHaveAttribute('href', /patreon\.com/)
  await expect(web.page.getByRole('contentinfo').getByRole('link', { name: 'Maak Rondje mogelijk' })).toBeVisible()

  // The iOS and Android apps add "RondjeApp" to the user agent: no money anywhere.
  const app = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 RondjeApp' })
  const page = await app.newPage()
  await page.goto('/support')
  await expect(page.getByRole('heading', { name: 'Maak Rondje mogelijk', level: 1 })).toBeVisible()
  await expect(page.getByRole('link', { name: /Steun Rondje via/ })).toHaveCount(0)
  await expect(page.getByText(/Samen ongeveer/)).toHaveCount(0)
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Maak Rondje mogelijk' })).toHaveCount(0)
  await page.goto('/')
  await expect(page.getByRole('link', { name: /Hoe we gratis blijven/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /Over Rondje/ }).first()).toBeVisible()

  await web.context.close()
  await app.close()
})

test('daily jobs answer: housekeeping, appointment and friendly reminders', async ({ request }) => {
  // Without CRON_SECRET (as here) the jobs are open; Vercel Cron sends the secret in production.
  expect((await request.get('/api/cron/cleanup')).status()).toBe(200)
  const nudges = await request.get('/api/cron/nudges')
  expect(nudges.status()).toBe(200)
  // Outside the day in the Netherlands nobody is reminded, so only the shape is checked here.
  expect(await nudges.json()).toMatchObject({
    people: expect.any(Number),
    sent: expect.any(Object),
    pushed: 0,
    emailed: 0,
    reminders: { appointments: expect.any(Number), groupWalks: expect.any(Number), pushed: expect.any(Number), emailed: 0 },
  })
})

test('dog page: the portrait grows from the card, a paused dog answers 404', async ({ browser }) => {
  const visitor = await newPerson(browser)
  // The card's portrait and the page's share one name: opening a dog is one view transition, so the
  // page must not fall back to a loading screen first (onderzoek §3.2 "Kaart → pagina").
  await visitor.page.goto('/dogs')
  await expect(visitor.page.locator('.dcard').first()).toBeVisible()
  await visitor.page.evaluate(() => {
    const w = window as unknown as { __vt: string[] }
    w.__vt = []
    const start = document.startViewTransition?.bind(document)
    if (!start) return
    document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
      const transition = start(arg)
      transition.ready
        .then(() => w.__vt.push(...document.getAnimations().map((a) => (a.effect as KeyframeEffect | null)?.pseudoElement ?? '')))
        .catch(() => undefined)
      return transition
    }) as typeof document.startViewTransition
  })
  await visitor.page.locator('.dcard').first().click()
  await expect(visitor.page).toHaveURL(/\/dogs\/[^/?]+$/)
  await expect.poll(() => visitor.page.evaluate(() => (window as unknown as { __vt: string[] }).__vt.join(' '))).toMatch(/::view-transition-group\(dog-/)

  // A dog its owner paused is not there for others: a real 404, not a page that says so with 200.
  const id = unique()
  const owner = await newPerson(browser)
  await signUp(owner.page, { name: 'Ans', email: `ans-pause-${id}@e2e.test`, intent: 'owner' })
  await onboard(owner.page, { birthDate: '1951-04-02', city: 'Utrecht', bio: 'Ik ben Ans.', phone: '06 1234 5678', walker: false, owner: true })
  await addDog(owner.page, 'Pip')
  const dogUrl = new URL(owner.page.url()).pathname
  expect((await visitor.page.request.get(dogUrl)).status()).toBe(200)
  await owner.page.getByRole('button', { name: 'Even pauzeren' }).click()
  await expect(owner.page.getByRole('button', { name: 'Weer zichtbaar maken' })).toBeVisible()
  expect((await visitor.page.request.get(dogUrl)).status()).toBe(404)

  await owner.context.close()
  await visitor.context.close()
})
