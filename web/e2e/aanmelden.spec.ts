import { expect, request, test, type Page } from '@playwright/test'
import { newPerson, onboard, passQuiz, smallTargets, unique } from './helpers'

const PHONE = { viewport: { width: 390, height: 844 } }

/** The sign-up form that the choice on /aanmelden opened. */
async function createAccount(page: Page, name: string, email: string) {
  await page.getByLabel('Voornaam').fill(name)
  await page.getByLabel('E-mailadres').fill(email)
  await page.getByLabel('Wachtwoord').fill('wandelen-123')
  await page.getByRole('button', { name: 'Account maken' }).click()
  await expect(page).toHaveURL(/\/onboarding/)
}

test('/aanmelden: one screen, then a walker signs up, does the quiz, and the app gets in with the same account', async ({ browser }) => {
  test.setTimeout(180_000)
  const id = unique()
  const email = `lot-${id}@e2e.test`
  const { context, page } = await newPerson(browser, undefined, PHONE)

  // The poster link: the source is remembered with the existing invite cookie, only the channel word.
  await page.goto('/aanmelden?bron=whydonate')
  await expect(page.getByRole('heading', { name: 'Doe mee met Rondje Mee', level: 1 })).toBeVisible()
  expect((await context.cookies()).find((c) => c.name === 'rondje_ref')?.value).toBe('WHYDONATE')
  await expect(page).toHaveTitle('Aanmelden · Rondje Mee')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/aanmelden$/)

  const walk = page.getByRole('link', { name: 'Ik wil wandelen' })
  const owner = page.getByRole('link', { name: 'Ik heb een hond die een extra rondje kan gebruiken' })
  const shelter = page.getByRole('link', { name: 'Ik werk bij een dierenopvang' })
  await expect(walk).toHaveAttribute('href', '/signup?intent=walker')
  await expect(owner).toHaveAttribute('href', '/signup?intent=owner')
  await expect(shelter).toHaveAttribute('href', '/signup?intent=shelter')
  for (const choice of [walk, owner, shelter]) expect((await choice.boundingBox())!.height).toBeGreaterThanOrEqual(56)
  await expect(page.getByText('Je account werkt meteen in je browser. Straks log je met hetzelfde account in op de app voor iPhone en Android.')).toBeVisible()
  await expect(page.getByRole('main').getByRole('link', { name: 'Inloggen' })).toHaveAttribute('href', '/login')
  // Everything on the card fits on a 390×844 screen, without scrolling.
  const trust = page.getByText('Gratis · Altijd eerst samen kennismaken · 18+')
  const box = (await trust.boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(844)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(await smallTargets(page)).toEqual([])

  // "Ik wil wandelen": the existing walker sign-up, then onboarding with the role already chosen, then the quiz.
  await walk.click()
  await expect(page).toHaveURL(/\/signup\?intent=walker$/)
  await createAccount(page, 'Lot', email)
  await expect(page).toHaveURL(/intent=walker/)
  await onboard(page, { birthDate: '1999-03-03', city: 'Utrecht', bio: 'Ik wandel graag.', phone: '', walker: true, owner: false, quiz: false })
  await expect(page).toHaveURL(/\/profile\/quiz\?next=/)

  // Signed in, /aanmelden skips itself: a walker without the quiz goes to the quiz, after it to Vandaag.
  await page.goto('/aanmelden')
  await expect(page).toHaveURL(/\/profile\/quiz\?next=%2F$/)
  await passQuiz(page)
  await page.goto('/join')
  await expect(page).toHaveURL((url) => url.pathname === '/')

  // The promise on the page: the same account works in the iPhone and Android app. Exactly what the
  // app does: sign in without cookies or an Origin header, keep the bearer token, ask who is signed in.
  const app = await request.newContext({ baseURL: new URL(page.url()).origin })
  const signIn = await app.post('/api/auth/sign-in/email', { data: { email, password: 'wandelen-123' } })
  expect(signIn.ok()).toBe(true)
  const token = signIn.headers()['set-auth-token']
  expect(token).toBeTruthy()
  const me = await app.get('/api/v1/me', { headers: { Authorization: `Bearer ${token}` } })
  expect(me.status()).toBe(200)
  expect(await me.json()).toMatchObject({ user: { email, name: 'Lot' }, profile: { firstName: 'Lot', wantsToWalk: true, quizPassed: true } })
  await app.dispose()
  await context.close()
})

test('/aanmelden: "Ik heb een hond" leads to adding the dog; /join, /unete and /rejoindre open the same page', async ({ browser }) => {
  test.setTimeout(180_000)
  const id = unique()
  const { context, page } = await newPerson(browser, undefined, PHONE)

  for (const alias of ['/join', '/unete', '/rejoindre']) {
    const res = await page.request.get(`${alias}?bron=poster`, { maxRedirects: 0 })
    expect(res.status(), alias).toBe(307)
    expect(res.headers().location, alias).toMatch(/^(https?:\/\/[^/]+)?\/aanmelden\?bron=poster$/)
  }
  await page.goto('/unete')
  await expect(page).toHaveURL(/\/aanmelden$/)
  expect(await (await page.request.get('/sitemap.xml')).text()).toContain('/aanmelden<')

  await page.getByRole('link', { name: 'Ik heb een hond die een extra rondje kan gebruiken' }).click()
  await expect(page).toHaveURL(/\/signup\?intent=owner$/)
  await createAccount(page, 'Henk', `henk-${id}@e2e.test`)
  await expect(page).toHaveURL(/intent=owner/)
  await onboard(page, { birthDate: '1948-05-05', city: 'Utrecht', bio: 'Ik ben Henk.', phone: '', walker: false, owner: true })
  await expect(page).toHaveURL(/\/my-dogs\/new/)
  // An owner who is signed in skips the page and lands on Vandaag: no quiz for owners.
  await page.goto('/aanmelden')
  await expect(page).toHaveURL((url) => url.pathname === '/')
  await context.close()
})
