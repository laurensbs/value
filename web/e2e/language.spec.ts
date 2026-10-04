import { expect, test } from '@playwright/test'
import { newPerson, onboard, signUp, unique } from './helpers'

// The language: a choice (cookie, then profile) first, then the browser's language, then the country, then Dutch.

test('language: the browser decides, then the country, and the picker remembers the choice', async ({ browser }) => {
  // An English browser gets English, also in the Netherlands.
  const expat = await newPerson(browser, undefined, { locale: 'en-GB' })
  await expat.page.goto('/')
  await expect(expat.page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(expat.page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible()
  const nl = { 'Accept-Language': 'en-GB,en;q=0.9', 'x-vercel-ip-country': 'NL' }
  expect(await (await expat.page.request.get('/safety', { headers: nl })).text()).toMatch(/<html lang="en"/)
  await expat.context.close()

  // A browser language we don't have: the country decides (Vercel's x-vercel-ip-country), else Dutch.
  const visitor = await newPerson(browser, undefined, { locale: 'de-DE' })
  const lang = async (headers: Record<string, string>) =>
    /<html lang="([a-z]+)"/.exec(await (await visitor.page.request.get('/safety', { headers })).text())?.[1]
  expect(await lang({ 'Accept-Language': 'de-DE', 'x-vercel-ip-country': 'DE' })).toBe('en')
  expect(await lang({ 'Accept-Language': 'de-DE', 'x-vercel-ip-country': 'ES' })).toBe('es')
  expect(await lang({ 'Accept-Language': 'de-DE', 'x-vercel-ip-country': 'BE' })).toBe('nl')
  expect(await lang({ 'Accept-Language': 'de-DE' })).toBe('nl')
  await visitor.context.close()

  // A Dutch browser picks English in the top bar: the page switches, and stays English afterwards.
  const { context, page } = await newPerson(browser)
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl')
  await page.getByRole('banner').getByLabel('Taal').selectOption('en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeVisible()
  expect((await context.cookies()).find((c) => c.name === 'NEXT_LOCALE')?.value).toBe('en')
  await page.goto('/safety')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/safety/i)
  // The choice beats the browser and the country.
  expect(await (await page.request.get('/', { headers: { 'Accept-Language': 'es-ES', 'x-vercel-ip-country': 'ES' } })).text()).toMatch(/<html lang="en"/)
  // The footer has the picker too, so it can be changed back anywhere.
  await page.getByRole('contentinfo').getByLabel('Language').selectOption('nl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'nl')
  await context.close()
})

test('language: a signed-in choice follows you to another device', async ({ browser }) => {
  const id = unique()
  const email = `taal-${id}@e2e.test`
  const first = await newPerson(browser)
  await signUp(first.page, { name: 'Sam', email, intent: 'owner' })
  await onboard(first.page, { birthDate: '1996-04-05', city: 'Utrecht', bio: 'Ik woon hier net.', phone: '', walker: false, owner: true })

  // Signed in on a phone the top bar has no room for the picker, but the footer of every page does.
  await first.page.goto('/')
  await expect(first.page.getByRole('contentinfo').getByLabel('Taal')).toBeVisible()
  await first.page.goto('/profile')
  await first.page.getByRole('main').getByLabel('Taal').selectOption('en')
  await expect(first.page.locator('html')).toHaveAttribute('lang', 'en')
  await first.context.close()

  // Another browser, still Dutch: after signing in, the profile's language wins.
  const second = await newPerson(browser)
  await second.page.goto('/login')
  await expect(second.page.locator('html')).toHaveAttribute('lang', 'nl')
  await second.page.getByLabel('E-mailadres').fill(email)
  await second.page.getByLabel('Wachtwoord').fill('wandelen-123')
  await second.page.getByRole('button', { name: 'Inloggen', exact: true }).click()
  await second.page.waitForURL((url) => url.pathname !== '/login')
  await second.page.goto('/profile')
  await expect(second.page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(second.page.getByRole('main').getByLabel('Language')).toHaveValue('en')
  await second.context.close()
})
